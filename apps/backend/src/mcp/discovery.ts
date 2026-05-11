/**
 * MCP Discovery — connects to an MCP server and discovers all its tools.
 *
 * This is the dynamic tool discovery pipeline:
 *   1. Connect to MCP server
 *   2. Call tools/list
 *   3. Register discovered tools in the registry
 *   4. Persist discovered tools to database
 *
 * No hardcoded tool lists anywhere.
 */

import type { McpStdioClient } from "./stdio-client.js";
import type { ToolRegistry } from "./registry.js";
import { getPrismaClient } from "../db/client.js";

export interface DiscoveryResult {
  serverId: string;
  serverName: string;
  toolCount: number;
  tools: string[];
}

/**
 * Discover all tools from a connected MCP client and register them.
 */
export async function discoverTools(
  client: McpStdioClient,
  registry: ToolRegistry,
): Promise<DiscoveryResult> {
  // 1. List tools from the MCP server
  const tools = await client.listTools();

  // 2. Register in the in-memory registry
  registry.registerTools(client.serverId, client.serverName, tools);

  // 3. Persist to database (for dashboard visibility)
  await persistDiscoveredTools(client.serverId, tools);

  return {
    serverId: client.serverId,
    serverName: client.serverName,
    toolCount: tools.length,
    tools: tools.map((t) => t.name),
  };
}

/**
 * Persist discovered tools to the database.
 * Upserts to handle reconnection scenarios cleanly.
 */
async function persistDiscoveredTools(
  serverId: string,
  tools: Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
  }>,
): Promise<void> {
  const prisma = getPrismaClient();

  // Delete old tool records for this server, then insert fresh
  await prisma.$transaction([
    prisma.mcpTool.deleteMany({ where: { serverId } }),
    ...tools.map((tool) =>
      prisma.mcpTool.create({
        data: {
          serverId,
          name: tool.name,
          description: tool.description ?? "",
          inputSchema: (tool.inputSchema as object) ?? {},
        },
      }),
    ),
  ]);
}
