/**
 * Approval workflow API routes.
 *
 * GET  /api/approvals              — List pending approvals
 * POST /api/approvals/:id/approve  — Approve + EXECUTE the tool
 * POST /api/approvals/:id/reject   — Reject a request
 */

import { Router, type Request, type Response } from "express";
import {
  getPendingApprovals,
  approveRequest,
  rejectRequest,
} from "../../approvals/service.js";
import { executeApprovedToolCall } from "../../approvals/execute.js";
import {
  emitApprovalApproved,
  emitApprovalRejected,
  emitApprovalResolved,
  emitConversationSync,
} from "../../websocket/events.js";

export const approvalRouter = Router();

function readApprovalId(req: Request, res: Response): string | undefined {
  const raw = req.params["id"];
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (typeof id !== "string" || id.length === 0) {
    res.status(400).json({ success: false, message: "Missing approval id" });
    return undefined;
  }
  return id;
}

// ─── GET / — List pending ────────────────────────────────

approvalRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const approvals = await getPendingApprovals();
    return res.json({ success: true, data: approvals });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Server error",
    });
  }
});

// ─── POST /:id/approve — Approve + Execute ───────────────

approvalRouter.post("/:id/approve", async (req: Request, res: Response) => {
  try {
    const approvalId = readApprovalId(req, res);
    if (approvalId === undefined) return;

    const decidedBy =
      ((req.body as Record<string, unknown>)?.decidedBy as string) ?? "admin";
    const approval = await approveRequest(approvalId, decidedBy);

    emitApprovalApproved({
      approvalId: approval.id,
      toolCallId: approval.toolCallId,
      toolName: approval.toolName,
      conversationId: approval.conversationId,
    });

    let executionResult = "";
    try {
      executionResult = await executeApprovedToolCall(approval.toolCallId);
    } catch (execErr) {
      executionResult = `Execution failed: ${execErr instanceof Error ? execErr.message : "Unknown error"}`;
    }

    emitApprovalResolved({
      approvalId: approval.id,
      toolCallId: approval.toolCallId,
      toolName: approval.toolName,
      conversationId: approval.conversationId,
      status: "APPROVED",
      result: executionResult,
    });

    emitConversationSync({ conversationId: approval.conversationId });

    return res.json({
      success: true,
      data: {
        ...approval,
        executionResult,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Invalid request",
    });
  }
});

// ─── POST /:id/reject — Reject ──────────────────────────

approvalRouter.post("/:id/reject", async (req: Request, res: Response) => {
  try {
    const approvalId = readApprovalId(req, res);
    if (approvalId === undefined) return;

    const decidedBy =
      ((req.body as Record<string, unknown>)?.decidedBy as string) ?? "admin";
    const approval = await rejectRequest(approvalId, decidedBy);

    emitApprovalRejected({
      approvalId: approval.id,
      toolCallId: approval.toolCallId,
      toolName: approval.toolName,
      conversationId: approval.conversationId,
    });

    emitApprovalResolved({
      approvalId: approval.id,
      toolCallId: approval.toolCallId,
      toolName: approval.toolName,
      conversationId: approval.conversationId,
      status: "REJECTED",
    });

    emitConversationSync({ conversationId: approval.conversationId });

    return res.json({ success: true, data: approval });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Invalid request",
    });
  }
});
