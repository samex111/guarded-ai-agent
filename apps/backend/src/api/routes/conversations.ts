/**
 * Conversation API routes.
 *
 * POST /api/conversations          — Create a new conversation
 * POST /api/conversations/:id/chat — Send a message to the agent
 * GET  /api/conversations/:id      — Get conversation details + messages
 * GET  /api/conversations          — List all conversations
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { runAgentLoop } from "../../agents/agent-loop.js";
import { getPrismaClient } from "../../db/client.js";

export const conversationRouter = Router();

function routeParamId(
  raw: string | string[] | undefined,
): string | undefined {
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].length > 0) {
    return raw[0];
  }
  return undefined;
}

// ─── Schemas ─────────────────────────────────────────────

const chatSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

const createSchema = z.object({
  title: z.string().optional(),
});

// ─── POST /api/conversations — Create ────────────────────

conversationRouter.post(
  "/",
  async (req: Request, res: Response) => {
    try {
      const body = createSchema.parse(req.body);
      const prisma = getPrismaClient();

      const conversation = await prisma.conversation.create({
        data: { title: body.title ?? "New Conversation" },
      });

      return res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : "Invalid request",
      });
    }
  },
);

// ─── POST /api/conversations/:id/chat — Send message ────

conversationRouter.post(
  "/:id/chat",
  async (req: Request, res: Response) => {
    try {
      const id = routeParamId(req.params["id"]);
      if (id === undefined) {
        return res.status(400).json({
          success: false,
          message: "Missing conversation id",
        });
      }
      const body = chatSchema.parse(req.body);

      console.log(`💬 Chat [${id}]: "${body.message.slice(0, 80)}"`);

      const response = await runAgentLoop(body.message, id);

      return res.json({
        success: true,
        data: {
          content: response.content,
          conversationId: response.conversationId,
          toolCalls: response.toolCalls.map((tc) => ({
            toolName: tc.toolName,
            success: tc.success,
            policyAction: tc.policyAction,
            latencyMs: tc.latencyMs,
          })),
          tokenUsage: response.tokenUsage,
        },
      });
    } catch (err) {
      console.error("Chat error:", err);
      return res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : "Agent error",
      });
    }
  },
);

// ─── GET /api/conversations/:id — Details ────────────────

conversationRouter.get(
  "/:id",
  async (req: Request, res: Response) => {
    try {
      const id = routeParamId(req.params["id"]);
      if (id === undefined) {
        return res.status(400).json({
          success: false,
          message: "Missing conversation id",
        });
      }
      const prisma = getPrismaClient();

      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          toolCalls: { orderBy: { createdAt: "asc" } },
        },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      return res.json({ success: true, data: conversation });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : "Server error",
      });
    }
  },
);

// ─── GET /api/conversations — List ───────────────────────

conversationRouter.get(
  "/",
  async (_req: Request, res: Response) => {
    try {
      const prisma = getPrismaClient();

      const conversations = await prisma.conversation.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          totalTokens: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
      });

      return res.json({ success: true, data: conversations });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : "Server error",
      });
    }
  },
);
