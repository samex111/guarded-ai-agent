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
import { emitAgentThinking } from "../websocket/events.js";

// ─── Groq Client Singleton ──────────────────────────────

let _groq: Groq | undefined;

function getGroqClient(): Groq {
  if (_groq === undefined) {
    const config = getConfig();
    _groq = new Groq({ apiKey: config.GROQ_API_KEY });
  }
  return _groq;
}

// ─── History Trimming ────────────────────────────────────

/**
 * Trim conversation history to fit within context limits.
 * Keeps the most recent messages, always preserving the system prompt.
 *
 * Groq/Llama models fail with malformed tool calls when history is too long.
 */
const MAX_HISTORY_MESSAGES = 30;

function trimHistory(messages: LLMMessage[]): LLMMessage[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages;

  const system = messages[0];
  if (system === undefined) return messages;

  const recent = messages.slice(-(MAX_HISTORY_MESSAGES - 1));

  return [system, ...recent];
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

  let messages: LLMMessage[] = [
    { role: "system", content: config.systemPrompt },
    ...history,
  ];

  // Trim to prevent context overflow → malformed tool calls
  messages = trimHistory(messages);

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
  let hadBlockedOrPending = false; // Track if any tool was blocked/pending

  while (iterations < config.maxIterations) {
    iterations++;

    emitAgentThinking({ conversationId, iteration: iterations });

    // ── Call LLM ──────────────────────────────────────────

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: config.model,
        messages: messages as Groq.Chat.ChatCompletionMessageParam[],
        ...(tools.length > 0
          ? {
              tools: tools as Groq.Chat.ChatCompletionTool[],
              tool_choice: "auto" as const,
            }
          : {}),
        temperature: 0.7,
        max_tokens: 4096,
      });
    } catch (err) {
      // Handle Groq-specific errors gracefully
      if (err instanceof Error && err.message.includes("tool_use_failed")) {
        console.warn("⚠️ Groq tool_use_failed — falling back to text-only response");

        // Retry WITHOUT tools to get a text response
        const fallback = await groq.chat.completions.create({
          model: config.model,
          messages: messages as Groq.Chat.ChatCompletionMessageParam[],
          temperature: 0.7,
          max_tokens: 4096,
        });

        const fallbackContent = fallback.choices[0]?.message?.content ?? "I encountered an issue processing your request. Could you please rephrase?";
        await saveAssistantMessage(conversationId, fallbackContent);

        if (fallback.usage) {
          cumulativeUsage.promptTokens += fallback.usage.prompt_tokens;
          cumulativeUsage.completionTokens += fallback.usage.completion_tokens;
          cumulativeUsage.totalTokens += fallback.usage.total_tokens;
        }
        await updateTokenUsage(conversationId, cumulativeUsage);

        return {
          content: fallbackContent,
          toolCalls: allToolCalls,
          tokenUsage: cumulativeUsage,
          conversationId,
        };
      }
      throw err; // Re-throw non-Groq errors
    }

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

      // Track blocked/pending calls
      if (result.policyAction === "DENY" || result.policyAction === "REQUIRE_APPROVAL") {
        hadBlockedOrPending = true;
      }

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

    // ── If a tool was blocked or needs approval, force text response ──
    // This prevents the LLM from retrying the same tool call in a loop
    if (hadBlockedOrPending) {
      try {
        const forceText = await groq.chat.completions.create({
          model: config.model,
          messages: messages as Groq.Chat.ChatCompletionMessageParam[],
          // No tools → forces a text response
          temperature: 0.7,
          max_tokens: 4096,
        });

        const content = forceText.choices[0]?.message?.content ?? "Some tool calls were blocked or require approval. Please check the approvals page.";
        await saveAssistantMessage(conversationId, content);

        if (forceText.usage) {
          cumulativeUsage.promptTokens += forceText.usage.prompt_tokens;
          cumulativeUsage.completionTokens += forceText.usage.completion_tokens;
          cumulativeUsage.totalTokens += forceText.usage.total_tokens;
        }
        await updateTokenUsage(conversationId, cumulativeUsage);

        return {
          content,
          toolCalls: allToolCalls,
          tokenUsage: cumulativeUsage,
          conversationId,
        };
      } catch {
        // If even text-only fails, return a hardcoded message
        const msg = "Some actions were blocked by policy or require admin approval. Please check the Approvals page in the dashboard.";
        await saveAssistantMessage(conversationId, msg);
        await updateTokenUsage(conversationId, cumulativeUsage);
        return { content: msg, toolCalls: allToolCalls, tokenUsage: cumulativeUsage, conversationId };
      }
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
