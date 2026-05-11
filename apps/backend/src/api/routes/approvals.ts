/**
 * Approval workflow API routes.
 *
 * GET  /api/approvals              — List pending approvals
 * POST /api/approvals/:id/approve  — Approve a request
 * POST /api/approvals/:id/reject   — Reject a request
 */

import { Router, type Request, type Response } from "express";
import {
  getPendingApprovals,
  approveRequest,
  rejectRequest,
} from "../../approvals/service.js";
import { io } from "../../server.js";

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

// ─── POST /:id/approve — Approve ─────────────────────────

approvalRouter.post("/:id/approve", async (req: Request, res: Response) => {
  try {
    const decidedBy = (req.body as Record<string, unknown>)?.decidedBy as string ?? "admin";
    const approval = await approveRequest(req.params.id, decidedBy);

    io.emit("approval:approved", {
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

// ─── POST /:id/reject — Reject ──────────────────────────

approvalRouter.post("/:id/reject", async (req: Request, res: Response) => {
  try {
    const decidedBy = (req.body as Record<string, unknown>)?.decidedBy as string ?? "admin";
    const approval = await rejectRequest(req.params.id, decidedBy);

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
