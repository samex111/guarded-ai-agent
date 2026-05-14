/**
 * Post-Approval Execution — executes a tool call after admin approval.
 *
 * This is the missing link:
 *   Admin approves → this module runs the tool → result sent to client
 *
 * Bypasses the policy engine (already approved by admin).
 * Writes result to DB; realtime events are emitted from MCP runtime and the approvals route.
 */

import { getPrismaClient } from "../db/client.js";
import { getMcpRuntime } from "../mcp/runtime.js";
import { logAudit } from "../policy/audit.js";

/**
 * Execute a tool call that was pending approval and is now approved.
 * Returns the execution result text.
 */
export async function executeApprovedToolCall(
  toolCallId: string,
): Promise<string> {
  const prisma = getPrismaClient();
  const mcpRuntime = getMcpRuntime();

  // 1. Load the original tool call from DB
  const toolCall = await prisma.toolCall.findUnique({
    where: { id: toolCallId },
  });

  if (!toolCall) {
    throw new Error(`Tool call ${toolCallId} not found`);
  }

  if (toolCall.status !== "APPROVED") {
    throw new Error(
      `Tool call ${toolCallId} is not approved (status: ${toolCall.status})`,
    );
  }

  // 2. Mark as executing
  await prisma.toolCall.update({
    where: { id: toolCallId },
    data: { status: "EXECUTING", startedAt: new Date() },
  });

  const startTime = Date.now();

  try {
    // 3. Execute via MCP — NO policy check (already approved by admin)
    const args =
      typeof toolCall.arguments === "object" && toolCall.arguments !== null
        ? (toolCall.arguments as Record<string, unknown>)
        : {};

    const mcpResult = await mcpRuntime.executeTool(toolCall.toolName, args, {
      conversationId: toolCall.conversationId,
      toolCallId: toolCall.id,
    });
    const latencyMs = Date.now() - startTime;

    // Extract text content
    const textContent = mcpResult.content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text!)
      .join("\n");

    const success = !mcpResult.isError;

    // 4. Update tool_call record with result
    await prisma.toolCall.update({
      where: { id: toolCallId },
      data: {
        status: success ? "COMPLETED" : "FAILED",
        result: { content: textContent, isError: mcpResult.isError } as object,
        latencyMs,
        completedAt: new Date(),
      },
    });

    // 5. Audit log
    logAudit({
      eventType: success ? "TOOL_EXECUTED" : "TOOL_FAILED",
      conversationId: toolCall.conversationId,
      toolCallId: toolCall.id,
      toolName: toolCall.toolName,
      details: { latencyMs, success, approvedExecution: true },
    });

    console.log(
      `✅ Post-approval execution: ${toolCall.toolName} completed in ${latencyMs}ms`,
    );

    return textContent || "(empty result)";
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMessage =
      err instanceof Error ? err.message : "Unknown execution error";

    await prisma.toolCall.update({
      where: { id: toolCallId },
      data: {
        status: "FAILED",
        error: errorMessage,
        latencyMs,
        completedAt: new Date(),
      },
    });

    logAudit({
      eventType: "TOOL_FAILED",
      conversationId: toolCall.conversationId,
      toolCallId: toolCall.id,
      toolName: toolCall.toolName,
      details: { error: errorMessage, latencyMs, approvedExecution: true },
    });

    console.error(
      `❌ Post-approval execution failed: ${toolCall.toolName} — ${errorMessage}`,
    );

    return `Error: ${errorMessage}`;
  }
}
