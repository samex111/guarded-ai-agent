/**
 * Agent type definitions.
 *
 * These types define the contract between the agent loop,
 * tool executor, memory, and LLM interface.
 */

// ─── LLM Message Types ──────────────────────────────────

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: LLMToolCall[];
  tool_call_id?: string;
}

export interface LLMToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// ─── Tool Execution Types ────────────────────────────────

export interface ToolCallRequest {
  /** LLM-generated call ID */
  callId: string;
  /** Tool name (as registered in the MCP registry) */
  toolName: string;
  /** Parsed arguments */
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  callId: string;
  toolName: string;
  /** Text result to feed back to the LLM */
  content: string;
  /** Whether the tool call succeeded */
  success: boolean;
  /** Policy decision that was applied */
  policyAction: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
  /** Database ID of the tool_call record */
  toolCallId?: string;
  /** Execution latency in ms (only for executed tools) */
  latencyMs?: number;
}

// ─── Agent Response ──────────────────────────────────────

export interface AgentResponse {
  /** Final text response from the agent */
  content: string;
  /** All tool calls made during this turn */
  toolCalls: ToolCallResult[];
  /** Token usage for this turn */
  tokenUsage: TokenUsage;
  /** Conversation ID */
  conversationId: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ─── Agent Config ────────────────────────────────────────

export interface AgentConfig {
  /** Maximum tool-use loop iterations before forcing a text response */
  maxIterations: number;
  /** LLM model to use */
  model: string;
  /** System prompt */
  systemPrompt: string;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxIterations: 10,
  model: "llama-3.3-70b-versatile",
  systemPrompt: `You are a helpful AI assistant with access to tools.

IMPORTANT RULES:
- Use tools when needed to fulfill user requests
- If a tool call is blocked by policy, explain what happened to the user
- If a tool call requires approval, tell the user it's pending admin approval
- Never try to bypass security policies or access restricted resources
- Always provide clear, honest responses about what actions you took
- If you cannot fulfill a request due to policy restrictions, suggest alternatives`,
};
