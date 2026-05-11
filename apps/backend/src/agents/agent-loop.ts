/**
 * Agent Loop — the core LLM tool-use orchestration loop.
 *
 * Flow:
 *   1. User sends a message
 *   2. Save to conversation history
 *   3. Load full history + available tools
 *   4. Call LLM (Groq)
 *   5. If LLM returns tool calls:
 *      a. Execute each through the guarded pipeline
 *      b. Feed results back to LLM
 *      c. Repeat (up to maxIterations)
 *   6. If LLM returns text → return as final response
 *
 * The LLM is untrusted. All tool calls pass through the policy engine.
 */

import Groq from "groq-sdk";
import { getConfig } from "../config/index.js";
import { getMcpRuntime } from "../mcp/runtime.js";
import { executeToolCall } from "./tool-executor.js";
import {
  loadHistory,
  saveUserMessage,
  saveAssistantMessage,
  saveToolMessage,
  updateTokenUsage,
  createConversation,
} from "./memory.js";
import {
  type AgentResponse,
  type ToolCallRequest,
  type ToolCallResult,
  type TokenUsage,
  type LLMMessage,
  type LLMToolCall,
  DEFAULT_AGENT_CONFIG,
  type AgentConfig,
} from "./types.js";

// ─── Groq Client Singleton ──────────────────────────────

let _groq: Groq | undefined;

function getGroqClient(): Groq {
  if (_groq === undefined) {
    const config = getConfig();
    _groq = new Groq({ apiKey: config.GROQ_API_KEY });
  }
  return _groq;
}

// ─── Main Agent Loop ─────────────────────────────────────

/**
 * Run the agent loop for a user message.
 *
 * Creates a new conversation if conversationId is not provided.
 * Returns the final assistant response with all tool call results.
 */
export async function runAgentLoop(
  userMessage: string,
  conversationId?: string,
  agentConfig?: Partial<AgentConfig>,
): Promise<AgentResponse> {
  const config = { ...DEFAULT_AGENT_CONFIG, ...agentConfig };
  const groq = getGroqClient();
  const registry = getMcpRuntime().getRegistry();

  // ─── Create or validate conversation ───────────────────

  if (!conversationId) {
    conversationId = await createConversation(
      userMessage.slice(0, 100),
    );
  }

  // ─── Save user message ─────────────────────────────────

  await saveUserMessage(conversationId, userMessage);

  // ─── Load conversation history ─────────────────────────

  const history = await loadHistory(conversationId);

  // ─── Build messages array for LLM ──────────────────────

  const messages: LLMMessage[] = [
    { role: "system", content: config.systemPrompt },
    ...history,
  ];

  // ─── Get available tools ───────────────────────────────

  const tools = registry.getToolsForLLM();

  // ─── Tool-use loop ─────────────────────────────────────

  const allToolCalls: ToolCallResult[] = [];
  const cumulativeUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  let iterations = 0;

  while (iterations < config.maxIterations) {
    iterations++;

    // ── Call LLM ──────────────────────────────────────────

    const completion = await groq.chat.completions.create({
      model: config.model,
      messages: messages as Groq.Chat.ChatCompletionMessageParam[],
      tools: tools.length > 0
        ? (tools as Groq.Chat.ChatCompletionTool[])
        : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
      temperature: 0.7,
      max_tokens: 4096,
    });

    // ── Track token usage ─────────────────────────────────

    if (completion.usage) {
      cumulativeUsage.promptTokens += completion.usage.prompt_tokens;
      cumulativeUsage.completionTokens +=
        completion.usage.completion_tokens;
      cumulativeUsage.totalTokens += completion.usage.total_tokens;
    }

    const choice = completion.choices[0];
    if (!choice) {
      throw new Error("No response from LLM");
    }

    const assistantMessage = choice.message;

    // ── No tool calls → final text response ───────────────

    if (
      !assistantMessage.tool_calls ||
      assistantMessage.tool_calls.length === 0
    ) {
      const content = assistantMessage.content ?? "";

      // Save assistant message
      await saveAssistantMessage(
        conversationId,
        content,
        completion.usage?.completion_tokens,
      );

      // Update token usage
      await updateTokenUsage(conversationId, cumulativeUsage);

      return {
        content,
        toolCalls: allToolCalls,
        tokenUsage: cumulativeUsage,
        conversationId,
      };
    }

    // ── Has tool calls → execute through guarded pipeline ──

    // Save the assistant message with tool calls (for history)
    const assistantContent = assistantMessage.content ?? null;

    // Add assistant message to conversation
    messages.push({
      role: "assistant",
      content: assistantContent,
      tool_calls: assistantMessage.tool_calls as LLMToolCall[],
    });

    await saveAssistantMessage(conversationId, assistantContent);

    // Execute each tool call
    for (const toolCall of assistantMessage.tool_calls) {
      // Parse arguments from JSON string
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(
          toolCall.function.arguments || "{}",
        ) as Record<string, unknown>;
      } catch {
        parsedArgs = {};
      }

      const request: ToolCallRequest = {
        callId: toolCall.id,
        toolName: toolCall.function.name,
        arguments: parsedArgs,
      };

      console.log(
        `🔧 Agent tool call: ${request.toolName}(${JSON.stringify(parsedArgs)})`,
      );

      // Execute through the guarded pipeline
      const result = await executeToolCall(request, conversationId);
      allToolCalls.push(result);

      // Save tool result message
      await saveToolMessage(
        conversationId,
        toolCall.id,
        request.toolName,
        result.content,
      );

      // Add tool result to messages for next LLM call
      messages.push({
        role: "tool",
        content: result.content,
        tool_call_id: toolCall.id,
      });

      console.log(
        `  → ${result.policyAction}: ${result.success ? "✅" : "❌"} ${result.content.slice(0, 100)}`,
      );
    }
  }

  // ── Max iterations reached ─────────────────────────────

  const fallbackContent =
    "I've reached the maximum number of tool-use iterations. Here's what I've done so far. Please let me know if you need anything else.";

  await saveAssistantMessage(conversationId, fallbackContent);
  await updateTokenUsage(conversationId, cumulativeUsage);

  return {
    content: fallbackContent,
    toolCalls: allToolCalls,
    tokenUsage: cumulativeUsage,
    conversationId,
  };
}
