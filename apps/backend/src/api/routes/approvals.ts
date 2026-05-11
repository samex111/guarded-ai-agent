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
import { getSocketIO } from "../../websocket/events.js";

export const approvalRouter = Router();

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
    const decidedBy = (req.body as Record<string, unknown>)?.decidedBy as string ?? "admin";
    const approval = await approveRequest(req.params.id, decidedBy);

    const io = getSocketIO();
    io.emit("approval:approved", {
      approvalId: approval.id,
      toolCallId: approval.toolCallId,
      toolName: approval.toolName,
    });

    // 🔑 Actually execute the tool now that it's approved
    let executionResult = "";
    try {
      executionResult = await executeApprovedToolCall(approval.toolCallId);
    } catch (execErr) {
      executionResult = `Execution failed: ${execErr instanceof Error ? execErr.message : "Unknown error"}`;
    }

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
    const decidedBy = (req.body as Record<string, unknown>)?.decidedBy as string ?? "admin";
    const approval = await rejectRequest(req.params.id, decidedBy);

    const io = getSocketIO();
    io.emit("approval:rejected", {
      approvalId: approval.id,
      toolCallId: approval.toolCallId,
      toolName: approval.toolName,
    });

    return res.json({ success: true, data: approval });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Invalid request",
    });
  }
});
