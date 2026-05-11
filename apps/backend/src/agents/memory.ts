/**
 * Conversation Memory — manages message history for the agent.
 *
 * Responsibilities:
 *   - Load conversation history from PostgreSQL
 *   - Save new messages (user, assistant, tool)
 *   - Format messages for the LLM API
 *   - Track token usage per conversation
 *   - Create new conversations
 */

import { getPrismaClient } from "../db/client.js";
import type { LLMMessage, TokenUsage } from "./types.js";

// ─── Conversation Management ─────────────────────────────

/** Create a new conversation. Returns the conversation ID. */
export async function createConversation(
  title?: string,
): Promise<string> {
  const prisma = getPrismaClient();

  const conversation = await prisma.conversation.create({
    data: {
      title: title ?? "New Conversation",
      status: "ACTIVE",
    },
  });

  return conversation.id;
}

/** Get conversation details. */
export async function getConversation(conversationId: string) {
  const prisma = getPrismaClient();
  return prisma.conversation.findUnique({
    where: { id: conversationId },
  });
}

// ─── Message Loading ─────────────────────────────────────

/**
 * Load conversation history formatted for the LLM API.
 * Returns messages in chronological order.
 */
export async function loadHistory(
  conversationId: string,
): Promise<LLMMessage[]> {
  const prisma = getPrismaClient();

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return messages.map((msg) => {
    const base: LLMMessage = {
      role: msg.role.toLowerCase() as LLMMessage["role"],
      content: msg.content,
    };

    // Tool result messages need tool_call_id
    if (msg.role === "TOOL" && msg.toolCallId) {
      base.tool_call_id = msg.toolCallId;
    }

    return base;
  });
}

// ─── Message Saving ──────────────────────────────────────

/** Save a user message. */
export async function saveUserMessage(
  conversationId: string,
  content: string,
): Promise<string> {
  const prisma = getPrismaClient();

  const message = await prisma.message.create({
    data: {
      conversationId,
      role: "USER",
      content,
    },
  });

  return message.id;
}

/** Save an assistant message (may include tool calls). */
export async function saveAssistantMessage(
  conversationId: string,
  content: string | null,
  tokenCount?: number,
): Promise<string> {
  const prisma = getPrismaClient();

  const message = await prisma.message.create({
    data: {
      conversationId,
      role: "ASSISTANT",
      content,
      tokenCount: tokenCount ?? null,
    },
  });

  return message.id;
}

/** Save a tool result message. */
export async function saveToolMessage(
  conversationId: string,
  toolCallId: string,
  toolName: string,
  content: string,
): Promise<string> {
  const prisma = getPrismaClient();

  const message = await prisma.message.create({
    data: {
      conversationId,
      role: "TOOL",
      content,
      toolCallId,
      toolName,
    },
  });

  return message.id;
}

// ─── Token Tracking ──────────────────────────────────────

/** Update conversation token usage (accumulative). */
export async function updateTokenUsage(
  conversationId: string,
  usage: TokenUsage,
): Promise<void> {
  const prisma = getPrismaClient();

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      promptTokens: { increment: usage.promptTokens },
      completionTokens: { increment: usage.completionTokens },
      totalTokens: { increment: usage.totalTokens },
    },
  });
}
