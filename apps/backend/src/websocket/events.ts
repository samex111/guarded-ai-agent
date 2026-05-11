/**
 * WebSocket Events — centralized Socket.io event emitter.
 *
 * All real-time events flow through here:
 *   - Tool execution results (allowed, blocked, approved)
 *   - Approval status changes
 *   - Policy updates
 *   - Chat messages
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

// ─── Event Emitters ──────────────────────────────────────

/** Emit when a tool call is executed (after policy allows or approval). */
export function emitToolExecuted(data: {
  conversationId: string;
  toolCallId: string;
  toolName: string;
  result: string;
  success: boolean;
  latencyMs?: number;
}): void {
  _io?.emit("tool:executed", data);
}

/** Emit when a tool call is blocked by policy. */
export function emitToolBlocked(data: {
  conversationId: string;
  toolName: string;
  reason: string;
}): void {
  _io?.emit("tool:blocked", data);
}

/** Emit when a new approval is needed. */
export function emitApprovalNeeded(data: {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  conversationId: string;
  arguments: unknown;
  expiresAt: string;
}): void {
  _io?.emit("approval:needed", data);
}

/** Emit when an approval is resolved (approved/rejected/expired). */
export function emitApprovalResolved(data: {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  conversationId: string;
  status: "APPROVED" | "REJECTED" | "EXPIRED";
  result?: string;
}): void {
  _io?.emit("approval:resolved", data);
}

/** Emit when a new chat message is available. */
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
  _io?.emit("chat:message", data);
}

/** Emit when policies are updated. */
export function emitPolicyUpdated(data: {
  action: string;
  ruleId: string;
}): void {
  _io?.emit("policy:updated", data);
}
