/**
 * MCP Runtime — orchestrates all MCP server connections.
 *
 * Responsibilities:
 *   - Load MCP server configs from database
 *   - Connect to each enabled server
 *   - Trigger dynamic tool discovery
 *   - Route tool execution to the correct server
 *   - Handle disconnection / reconnection
 *   - Graceful shutdown
 */

import { McpStdioClient, type StdioClientConfig, type ToolCallResult } from "./stdio-client.js";
import { ToolRegistry } from "./registry.js";
import { discoverTools, type DiscoveryResult } from "./discovery.js";
import { getPrismaClient } from "../db/client.js";
import type { McpTransport } from "../generated/prisma/client.js";
import {
  emitToolCompleted,
  emitToolFailed,
  emitToolStarted,
} from "../websocket/events.js";

/** Optional correlation for realtime MCP telemetry. */
export interface McpExecuteContext {
  conversationId?: string;
  toolCallId?: string;
}

export interface McpServerRecord {
  id: string;
  name: string;
  transport: McpTransport;
  command: string | null;
  args: unknown;
  url: string | null;
  env: unknown;
  enabled: boolean;
}

export class McpRuntime {
  private clients = new Map<string, McpStdioClient>();
  private registry = new ToolRegistry();

  /** Initialize: load server configs from DB and connect. */
  async initialize(): Promise<void> {
    const prisma = getPrismaClient();

    const servers = await prisma.mcpServer.findMany({
      where: { enabled: true },
    });

    console.log(`🔍 Found ${servers.length} enabled MCP server(s) in database`);

    const results: DiscoveryResult[] = [];

    for (const server of servers) {
      try {
        const result = await this.connectServer(server);
        results.push(result);
      } catch (err) {
        console.error(
          `❌ Failed to connect MCP server "${server.name}":`,
          err instanceof Error ? err.message : err,
        );

        // Update server status in DB
        await prisma.mcpServer.update({
          where: { id: server.id },
          data: { status: "ERROR" },
        });
      }
    }

    console.log(
      `✅ MCP Runtime initialized: ${results.length} server(s), ${this.registry.size()} tool(s)`,
    );
  }

  /** Connect to a single MCP server and discover its tools. */
  async connectServer(server: McpServerRecord): Promise<DiscoveryResult> {
    if (server.transport !== "STDIO") {
      throw new Error(`Transport "${server.transport}" not yet supported`);
    }

    if (!server.command) {
      throw new Error(`Server "${server.name}" has no command configured`);
    }

    const args = Array.isArray(server.args) ? (server.args as string[]) : [];
    const env =
      server.env && typeof server.env === "object" && !Array.isArray(server.env)
        ? (server.env as Record<string, string>)
        : {};

    const config: StdioClientConfig = {
      serverId: server.id,
      serverName: server.name,
      command: server.command,
      args,
      env,
    };

    const client = new McpStdioClient(config);

    // Connect to the server
    await client.connect();
    this.clients.set(server.id, client);

    // Discover tools dynamically
    const result = await discoverTools(client, this.registry);

    // Update DB status
    const prisma = getPrismaClient();
    await prisma.mcpServer.update({
      where: { id: server.id },
      data: {
        status: "CONNECTED",
        lastConnectedAt: new Date(),
      },
    });

    return result;
  }

  /** Disconnect a specific server. */
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (!client) return;

    await client.disconnect();
    this.clients.delete(serverId);
    this.registry.unregisterServer(serverId);

    const prisma = getPrismaClient();
    await prisma.mcpServer.update({
      where: { id: serverId },
      data: { status: "DISCONNECTED" },
    });
  }

  /**
   * Execute a tool by name.
   * Automatically routes to the correct MCP server.
   */
  async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    context?: McpExecuteContext,
  ): Promise<ToolCallResult> {
    const tool = this.registry.getTool(toolName);

    if (!tool) {
      throw new Error(`Tool "${toolName}" not found in registry`);
    }

    const client = this.clients.get(tool.serverId);

    if (!client || !client.isConnected()) {
      throw new Error(
        `MCP server "${tool.serverName}" is not connected`,
      );
    }

    const startTime = Date.now();
    emitToolStarted({
      toolName,
      serverName: tool.serverName,
      timestamp: new Date().toISOString(),
      ...(context?.conversationId !== undefined
        ? { conversationId: context.conversationId }
        : {}),
      ...(context?.toolCallId !== undefined ? { toolCallId: context.toolCallId } : {}),
    });

    try {
      const result = await client.callTool(toolName, args);
      const latencyMs = Date.now() - startTime;

      console.log(
        `🔧 Tool "${toolName}" executed in ${latencyMs}ms (server: "${tool.serverName}")`,
      );

      const textContent = result.content
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text!)
        .join("\n");
      const success = !result.isError;

      emitToolCompleted({
        toolName,
        serverName: tool.serverName,
        success,
        latencyMs,
        resultSummary:
          textContent.length > 400 ? `${textContent.slice(0, 400)}…` : textContent,
        ...(context?.conversationId !== undefined
          ? { conversationId: context.conversationId }
          : {}),
        ...(context?.toolCallId !== undefined ? { toolCallId: context.toolCallId } : {}),
      });

      return result;
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      console.error(
        `❌ Tool "${toolName}" failed after ${latencyMs}ms:`,
        errorMessage,
      );

      emitToolFailed({
        toolName,
        serverName: tool.serverName,
        latencyMs,
        error: errorMessage,
        ...(context?.conversationId !== undefined
          ? { conversationId: context.conversationId }
          : {}),
        ...(context?.toolCallId !== undefined ? { toolCallId: context.toolCallId } : {}),
      });

      throw err;
    }
  }

  /** Get the tool registry. */
  getRegistry(): ToolRegistry {
    return this.registry;
  }

  /** Get all connected client IDs. */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /** Graceful shutdown — disconnect all servers. */
  async shutdown(): Promise<void> {
    console.log("🔌 Shutting down MCP Runtime...");

    const disconnects = Array.from(this.clients.keys()).map((id) =>
      this.disconnectServer(id),
    );

    await Promise.allSettled(disconnects);

    console.log("✅ MCP Runtime shut down");
  }
}

// ─── Singleton ───────────────────────────────────────────

let _runtime: McpRuntime | undefined;

export function getMcpRuntime(): McpRuntime {
  if (_runtime === undefined) {
    _runtime = new McpRuntime();
  }
  return _runtime;
}
