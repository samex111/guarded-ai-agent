/**
 * Tool Executor — the guarded pipeline from LLM tool call to MCP execution.
 *
 * This is the ONLY path from the agent to MCP tools.
 * Every tool call passes through the policy engine.
 *
 * Pipeline:
 *   1. Create tool_call record in DB
 *   2. Evaluate against policy engine
 *   3. If DENY  → return blocked message
 *   4. If APPROVAL → create pending approval, return pending message
 *   5. If ALLOW → execute via MCP runtime
 *   6. Update tool_call record with result
 *   7. Return result to agent loop
 */

import { getPrismaClient } from "../db/client.js";
import { getMcpRuntime } from "../mcp/runtime.js";
import { evaluate } from "../policy/engine.js";
import { logAudit } from "../policy/audit.js";
import { createApproval } from "../approvals/service.js";
import type { ToolCallRequest, ToolCallResult } from "./types.js";
import { emitApprovalNeeded, emitToolBlocked, emitToolExecuted } from "../websocket/events.js";

/**
 * Execute a single tool call through the full guarded pipeline.
 */
export async function executeToolCall(
  request: ToolCallRequest,
  conversationId: string,
): Promise<ToolCallResult> {
  const prisma = getPrismaClient();
  const mcpRuntime = getMcpRuntime();
  const registry = mcpRuntime.getRegistry();

  // ─── 1. Resolve tool from registry ───────────────────────

  const registeredTool = registry.getTool(request.toolName);

  if (!registeredTool) {
    return {
      callId: request.callId,
      toolName: request.toolName,
      content: `Error: Tool "${request.toolName}" is not available. It may not exist or its MCP server is disconnected.`,
      success: false,
      policyAction: "DENY",
    };
  }

  // ─── 2. Create tool_call record in DB ────────────────────

  const toolCall = await prisma.toolCall.create({
    data: {
      conversationId,
      toolName: request.toolName,
      serverName: registeredTool.serverName,
      arguments: request.arguments as object,
      status: "PENDING",
    },
  });

  // ─── 3. Policy evaluation ────────────────────────────────

  const decision = await evaluate({
    toolName: request.toolName,
    serverName: registeredTool.serverName,
    arguments: request.arguments,
    conversationId,
    toolCallId: toolCall.id,
  });

  // ─── 4. Handle DENY ──────────────────────────────────────

  if (decision.action === "DENY") {
    await prisma.toolCall.update({
      where: { id: toolCall.id },
      data: {
        status: "POLICY_BLOCKED",
        policyDecision: "DENY",
        completedAt: new Date(),
      },
    });

    const errorParts = [`Policy blocked: ${decision.reason}`];
    if (decision.validationErrors.length > 0) {
      errorParts.push(`Validation errors: ${decision.validationErrors.join("; ")}`);
    }

    emitToolBlocked({
      conversationId,
      toolName: request.toolName,
      reason: decision.reason,
    });

    return {
      callId: request.callId,
      toolName: request.toolName,
      content: errorParts.join("\n"),
      success: false,
      policyAction: "DENY",
      toolCallId: toolCall.id,
    };
  }

  // ─── 5. Handle REQUIRE_APPROVAL ──────────────────────────

  if (decision.action === "REQUIRE_APPROVAL" && decision.matchedRule) {
    await prisma.toolCall.update({
      where: { id: toolCall.id },
      data: {
        status: "AWAITING_APPROVAL",
        policyDecision: "REQUIRE_APPROVAL",
      },
    });

    // Create the pending approval record
    const approval = await createApproval({
      toolCallId: toolCall.id,
      conversationId,
      policyRuleId: decision.matchedRule.id,
      toolName: request.toolName,
      arguments: request.arguments,
    });

    emitApprovalNeeded({
      approvalId: approval.id,
      toolCallId: toolCall.id,
      toolName: request.toolName,
      conversationId,
      arguments: request.arguments,
      expiresAt: approval.expiresAt.toISOString(),
    });

    return {
      callId: request.callId,
      toolName: request.toolName,
      content: `This action requires admin approval: ${decision.reason}. The request has been submitted and is pending review.`,
      success: false,
      policyAction: "REQUIRE_APPROVAL",
      toolCallId: toolCall.id,
    };
  }

  // ─── 6. ALLOW — Execute via MCP ──────────────────────────

  await prisma.toolCall.update({
    where: { id: toolCall.id },
    data: {
      status: "EXECUTING",
      policyDecision: "ALLOW",
      startedAt: new Date(),
    },
  });

  const startTime = Date.now();

  try {
    const mcpResult = await mcpRuntime.executeTool(
      request.toolName,
      request.arguments,
    );

    const latencyMs = Date.now() - startTime;

    // Extract text content from MCP result
    const textContent = mcpResult.content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text!)
      .join("\n");

    const success = !mcpResult.isError;

    // Update tool_call record
    await prisma.toolCall.update({
      where: { id: toolCall.id },
      data: {
        status: success ? "COMPLETED" : "FAILED",
        result: { content: textContent, isError: mcpResult.isError } as object,
        latencyMs,
        completedAt: new Date(),
      },
    });

    logAudit({
      eventType: success ? "TOOL_EXECUTED" : "TOOL_FAILED",
      conversationId,
      toolCallId: toolCall.id,
      toolName: request.toolName,
      details: {
        latencyMs,
        success,
        resultLength: textContent.length,
      },
    });

    emitToolExecuted({
      conversationId,
      toolCallId: toolCall.id,
      toolName: request.toolName,
      result: textContent,
      success,
      latencyMs,
    });

    return {
      callId: request.callId,
      toolName: request.toolName,
      content: textContent || "(empty result)",
      success,
      policyAction: "ALLOW",
      toolCallId: toolCall.id,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMessage =
      err instanceof Error ? err.message : "Unknown execution error";

    await prisma.toolCall.update({
      where: { id: toolCall.id },
      data: {
        status: "FAILED",
        error: errorMessage,
        latencyMs,
        completedAt: new Date(),
      },
    });

    logAudit({
      eventType: "TOOL_FAILED",
      conversationId,
      toolCallId: toolCall.id,
      toolName: request.toolName,
      details: { error: errorMessage, latencyMs },
    });

    return {
      callId: request.callId,
      toolName: request.toolName,
      content: `Execution error: ${errorMessage}`,
      success: false,
      policyAction: "ALLOW",
      toolCallId: toolCall.id,
      latencyMs,
    };
  }
}
