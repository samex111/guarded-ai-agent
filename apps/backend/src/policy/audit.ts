/**
 * Audit Logger — records all policy decisions and tool executions.
 *
 * Fire-and-forget design: audit logging NEVER blocks tool execution.
 * Writes directly to PostgreSQL via Prisma.
 *
 * In Phase 5, this can be backed by BullMQ for async batched writes.
 */

import { getPrismaClient } from "../db/client.js";
import type { AuditEventType } from "../generated/prisma/client.js";

export interface AuditEvent {
  eventType: AuditEventType;
  conversationId?: string;
  toolCallId?: string;
  policyRuleId?: string;
  toolName?: string;
  details?: Record<string, unknown>;
}

/**
 * Log an audit event — fire and forget.
 * Never blocks the calling code. Errors are logged to console.
 */
export function logAudit(event: AuditEvent): void {
  writeAuditLog(event).catch((err: unknown) => {
    console.error("⚠️ Audit log write failed:", err);
  });
}

/**
 * Log an audit event and wait for it to complete.
 * Use this only when the audit log must be persisted before continuing.
 */
export async function logAuditSync(event: AuditEvent): Promise<void> {
  await writeAuditLog(event);
}

async function writeAuditLog(event: AuditEvent): Promise<void> {
  const prisma = getPrismaClient();

  await prisma.auditLog.create({
    data: {
      eventType: event.eventType,
      conversationId: event.conversationId ?? null,
      toolCallId: event.toolCallId ?? null,
      policyRuleId: event.policyRuleId ?? null,
      toolName: event.toolName ?? null,
      details: (event.details as object) ?? {},
    },
  });
}

/**
 * Query audit logs with pagination and filtering.
 */
export async function queryAuditLogs(options: {
  conversationId?: string;
  eventType?: AuditEventType;
  limit?: number;
  offset?: number;
}): Promise<{
  logs: Array<{
    id: string;
    eventType: string;
    toolName: string | null;
    details: unknown;
    createdAt: Date;
    conversationId: string | null;
    toolCallId: string | null;
    policyRuleId: string | null;
  }>;
  total: number;
}> {
  const prisma = getPrismaClient();
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const where = {
    ...(options.conversationId ? { conversationId: options.conversationId } : {}),
    ...(options.eventType ? { eventType: options.eventType } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
