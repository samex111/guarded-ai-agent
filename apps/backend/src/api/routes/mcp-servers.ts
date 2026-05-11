/**
 * MCP Server + Tools API routes.
 *
 * GET /api/mcp/servers — List all MCP servers
 * GET /api/mcp/tools   — List all discovered tools
 */

import { Router, type Request, type Response } from "express";
import { getPrismaClient } from "../../db/client.js";
import { getMcpRuntime } from "../../mcp/runtime.js";

export const mcpRouter = Router();

// ─── GET /servers — List MCP servers ─────────────────────

mcpRouter.get("/servers", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrismaClient();
    const servers = await prisma.mcpServer.findMany({
      include: { tools: true },
      orderBy: { createdAt: "asc" },
    });
    return res.json({ success: true, data: servers });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Server error",
    });
  }
});

// ─── GET /tools — List discovered tools ──────────────────

mcpRouter.get("/tools", async (_req: Request, res: Response) => {
  try {
    const runtime = getMcpRuntime();
    const tools = runtime.getRegistry().getAllTools();

    return res.json({
      success: true,
      data: tools.map((t) => ({
        name: t.name,
        description: t.description,
        serverName: t.serverName,
        serverId: t.serverId,
      })),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Server error",
    });
  }
});
