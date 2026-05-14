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
    const q = req.query;
    const convRaw = q["conversationId"];
    const conv =
      typeof convRaw === "string"
        ? convRaw
        : Array.isArray(convRaw) && typeof convRaw[0] === "string"
          ? convRaw[0]
          : undefined;
    const etRaw = q["eventType"];
    const etStr =
      typeof etRaw === "string"
        ? etRaw
        : Array.isArray(etRaw) && typeof etRaw[0] === "string"
          ? etRaw[0]
          : undefined;
    const limRaw = q["limit"];
    const limStr =
      typeof limRaw === "string"
        ? limRaw
        : Array.isArray(limRaw) && typeof limRaw[0] === "string"
          ? limRaw[0]
          : undefined;
    const offRaw = q["offset"];
    const offStr =
      typeof offRaw === "string"
        ? offRaw
        : Array.isArray(offRaw) && typeof offRaw[0] === "string"
          ? offRaw[0]
          : undefined;

    const result = await queryAuditLogs({
      ...(conv !== undefined && conv.length > 0 ? { conversationId: conv } : {}),
      ...(etStr !== undefined && etStr.length > 0
        ? { eventType: etStr as AuditEventType }
        : {}),
      ...(limStr !== undefined ? { limit: parseInt(limStr, 10) } : {}),
      ...(offStr !== undefined ? { offset: parseInt(offStr, 10) } : {}),
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
