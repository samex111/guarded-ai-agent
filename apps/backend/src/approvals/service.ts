/**
 * Approval Service — manages the human-in-the-loop approval workflow.
 *
 * Flow:
 *   1. Policy engine returns REQUIRE_APPROVAL
 *   2. Agent creates a pending approval via this service
 *   3. Dashboard shows the approval in a queue
 *   4. Admin approves or rejects
 *   5. Agent resumes with the decision
 *
 * Pending approvals are persisted in PostgreSQL.
 * Expired approvals are auto-rejected.
 */

import { getPrismaClient } from "../db/client.js";
import { getConfig } from "../config/index.js";
import { logAudit } from "../policy/audit.js";

export interface CreateApprovalInput {
  toolCallId: string;
  conversationId: string;
  policyRuleId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface ApprovalRecord {
  id: string;
  toolCallId: string;
  conversationId: string;
  policyRuleId: string;
  toolName: string;
  arguments: unknown;
  status: string;
  decidedBy: string | null;
  decidedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

// ─── Create ──────────────────────────────────────────────

/**
 * Create a pending approval request.
 * Returns the approval record for tracking.
 */
export async function createApproval(
  input: CreateApprovalInput,
): Promise<ApprovalRecord> {
  const prisma = getPrismaClient();
  const config = getConfig();

  const expiresAt = new Date(Date.now() + config.APPROVAL_TIMEOUT_MS);

  const approval = await prisma.pendingApproval.create({
    data: {
      toolCallId: input.toolCallId,
      conversationId: input.conversationId,
      policyRuleId: input.policyRuleId,
      toolName: input.toolName,
      arguments: input.arguments as object,
      status: "PENDING",
      expiresAt,
    },
  });

  // Update the tool call status
  await prisma.toolCall.update({
    where: { id: input.toolCallId },
    data: { status: "AWAITING_APPROVAL" },
  });

  logAudit({
    eventType: "TOOL_APPROVAL_REQUIRED",
    conversationId: input.conversationId,
    toolCallId: input.toolCallId,
    policyRuleId: input.policyRuleId,
    toolName: input.toolName,
    details: { expiresAt: expiresAt.toISOString() },
  });

  return approval;
}

// ─── Approve ─────────────────────────────────────────────

/**
 * Approve a pending approval.
 * Returns the updated approval record.
 */
export async function approveRequest(
  approvalId: string,
  decidedBy: string,
): Promise<ApprovalRecord> {
  const prisma = getPrismaClient();

  const approval = await prisma.pendingApproval.findUnique({
    where: { id: approvalId },
  });

  if (!approval) {
    throw new Error(`Approval ${approvalId} not found`);
  }

  if (approval.status !== "PENDING") {
    throw new Error(
      `Approval ${approvalId} is already ${approval.status}`,
    );
  }

  // Check expiration
  if (new Date() > approval.expiresAt) {
    await expireApproval(approvalId);
    throw new Error(`Approval ${approvalId} has expired`);
  }

  const updated = await prisma.pendingApproval.update({
    where: { id: approvalId },
    data: {
      status: "APPROVED",
      decidedBy,
      decidedAt: new Date(),
    },
  });

  // Update the tool call status
  await prisma.toolCall.update({
    where: { id: approval.toolCallId },
    data: { status: "APPROVED" },
  });

  logAudit({
    eventType: "TOOL_APPROVED",
    conversationId: approval.conversationId,
    toolCallId: approval.toolCallId,
    policyRuleId: approval.policyRuleId,
    toolName: approval.toolName,
    details: { decidedBy },
  });

  return updated;
}

// ─── Reject ──────────────────────────────────────────────

/**
 * Reject a pending approval.
 */
export async function rejectRequest(
  approvalId: string,
  decidedBy: string,
): Promise<ApprovalRecord> {
  const prisma = getPrismaClient();

  const approval = await prisma.pendingApproval.findUnique({
    where: { id: approvalId },
  });

  if (!approval) {
    throw new Error(`Approval ${approvalId} not found`);
  }

  if (approval.status !== "PENDING") {
    throw new Error(
      `Approval ${approvalId} is already ${approval.status}`,
    );
  }

  const updated = await prisma.pendingApproval.update({
    where: { id: approvalId },
    data: {
      status: "REJECTED",
      decidedBy,
      decidedAt: new Date(),
    },
  });

  await prisma.toolCall.update({
    where: { id: approval.toolCallId },
    data: { status: "REJECTED" },
  });

  logAudit({
    eventType: "TOOL_REJECTED",
    conversationId: approval.conversationId,
    toolCallId: approval.toolCallId,
    policyRuleId: approval.policyRuleId,
    toolName: approval.toolName,
    details: { decidedBy },
  });

  return updated;
}

// ─── Expire ──────────────────────────────────────────────

/**
 * Expire a pending approval (auto-reject on timeout).
 */
export async function expireApproval(approvalId: string): Promise<void> {
  const prisma = getPrismaClient();

  const approval = await prisma.pendingApproval.findUnique({
    where: { id: approvalId },
  });

  if (!approval || approval.status !== "PENDING") return;

  await prisma.pendingApproval.update({
    where: { id: approvalId },
    data: {
      status: "EXPIRED",
      decidedAt: new Date(),
    },
  });

  await prisma.toolCall.update({
    where: { id: approval.toolCallId },
    data: { status: "REJECTED" },
  });

  logAudit({
    eventType: "APPROVAL_EXPIRED",
    conversationId: approval.conversationId,
    toolCallId: approval.toolCallId,
    policyRuleId: approval.policyRuleId,
    toolName: approval.toolName,
  });
}

// ─── Queries ─────────────────────────────────────────────

/** Get all pending approvals. */
export async function getPendingApprovals(): Promise<ApprovalRecord[]> {
  const prisma = getPrismaClient();

  return prisma.pendingApproval.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

/** Get a specific approval by ID. */
export async function getApprovalById(
  id: string,
): Promise<ApprovalRecord | null> {
  const prisma = getPrismaClient();
  return prisma.pendingApproval.findUnique({ where: { id } });
}

/** Get approval by tool call ID. */
export async function getApprovalByToolCallId(
  toolCallId: string,
): Promise<ApprovalRecord | null> {
  const prisma = getPrismaClient();
  return prisma.pendingApproval.findUnique({
    where: { toolCallId },
  });
}

/** Expire all overdue pending approvals (cleanup job). */
export async function expireOverdueApprovals(): Promise<number> {
  const prisma = getPrismaClient();

  const overdue = await prisma.pendingApproval.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
  });

  for (const approval of overdue) {
    await expireApproval(approval.id);
  }

  if (overdue.length > 0) {
    console.log(`⏰ Expired ${overdue.length} overdue approval(s)`);
  }

  return overdue.length;
}
