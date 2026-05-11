/**
 * Audit Logs API routes.
 *
 * GET /api/audit — Query audit logs with filtering + pagination
 */

import { Router, type Request, type Response } from "express";
import { queryAuditLogs } from "../../policy/audit.js";
import type { AuditEventType } from "../../generated/prisma/client.js";

export const auditRouter = Router();

// ─── GET / — Query audit logs ────────────────────────────

auditRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { conversationId, eventType, limit, offset } = req.query;

    const result = await queryAuditLogs({
      conversationId: conversationId as string | undefined,
      eventType: eventType as AuditEventType | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    return res.json({
      success: true,
      data: result.logs,
      total: result.total,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Server error",
    });
  }
});
