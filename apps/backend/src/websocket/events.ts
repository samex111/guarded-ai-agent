/**
 * WebSocket Events — centralized Socket.io event emitter.
 *
 * All real-time events flow through here. Route handlers and services must not
 * call `io.emit` directly — use these helpers so event names stay consistent.
 */

import type { Server as SocketIOServer } from "socket.io";

let _io: SocketIOServer | undefined;

/** Set the Socket.io server instance (call once at startup). */
export function setSocketIO(io: SocketIOServer): void {
  _io = io;
}

/** Get the Socket.io server instance. */
export function getSocketIO(): SocketIOServer {
  if (!_io) throw new Error("Socket.io not initialized");
  return _io;
}

function emit(event: string, data: unknown): void {
  _io?.emit(event, data);
}

// ─── Agent / policy ──────────────────────────────────────

export function emitAgentThinking(data: {
  conversationId: string;
  iteration: number;
}): void {
  emit("agent:thinking", data);
}

export function emitPolicyChecking(data: {
  conversationId: string;
  toolName: string;
  toolCallId?: string;
}): void {
  emit("policy:checking", data);
}

// ─── Tool execution (MCP runtime + guarded executor) ─────

export function emitToolStarted(data: {
  toolName: string;
  serverName: string;
  conversationId?: string;
  toolCallId?: string;
  timestamp: string;
}): void {
  emit("tool:started", data);
}

export function emitToolCompleted(data: {
  toolName: string;
  serverName: string;
  success: boolean;
  latencyMs: number;
  conversationId?: string;
  toolCallId?: string;
  resultSummary?: string;
}): void {
  emit("tool:completed", data);
}

export function emitToolFailed(data: {
  toolName: string;
  serverName: string;
  latencyMs: number;
  error: string;
  conversationId?: string;
  toolCallId?: string;
}): void {
  emit("tool:failed", data);
}

export function emitToolBlocked(data: {
  conversationId: string;
  toolName: string;
  reason: string;
}): void {
  emit("tool:blocked", data);
}

// ─── Approvals ───────────────────────────────────────────

export function emitApprovalNeeded(data: {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  conversationId: string;
  arguments: unknown;
  expiresAt: string;
}): void {
  emit("approval:pending", data);
}

export function emitApprovalApproved(data: {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  conversationId: string;
}): void {
  emit("approval:approved", data);
}

export function emitApprovalRejected(data: {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  conversationId: string;
}): void {
  emit("approval:rejected", data);
}

export function emitApprovalResolved(data: {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  conversationId: string;
  status: "APPROVED" | "REJECTED" | "EXPIRED";
  result?: string;
}): void {
  emit("approval:resolved", data);
}

// ─── Chat / conversation sync ────────────────────────────

export function emitChatMessage(data: {
  conversationId: string;
  role: string;
  content: string;
  toolCalls?: Array<{
    toolName: string;
    success: boolean;
    policyAction: string;
  }>;
}): void {
  emit("chat:message", data);
}

/** Tell clients to refetch conversation (e.g. after approval + tool execution). */
export function emitConversationSync(data: { conversationId: string }): void {
  emit("conversation:sync", data);
}

// ─── Policies ────────────────────────────────────────────

export function emitPolicyUpdated(data: {
  action: string;
  ruleId: string;
  enabled?: boolean;
}): void {
  emit("policy:updated", data);
}

// ─── Lead scrape progress ───────────────────────────────

export function emitScrapePhase(data: {
  phase: string;
  message: string;
  website?: string;
  conversationId?: string;
}): void {
  emit("scrape:phase", { ...data, timestamp: new Date().toISOString() });
}

// ─── Lead lifecycle ──────────────────────────────────────

export function emitLeadCreated(data: {
  leadId: string;
  website: string;
  status: string;
  expiresAt: string | null;
  leadScore?: number;
  priority?: string;
  name?: string;
}): void {
  emit("lead:created", data);
}

export function emitLeadUpdated(data: { leadId: string }): void {
  emit("lead:updated", data);
}

export function emitLeadSaved(data: {
  leadId: string;
  status: string;
}): void {
  emit("lead:saved", data);
}

export function emitLeadDeleted(data: { leadId: string }): void {
  emit("lead:deleted", data);
}
