/**
 * MCP Stdio Client — wraps the MCP SDK Client for stdio transport.
 *
 * Spawns an MCP server as a child process and communicates via stdin/stdout.
 * Handles connection lifecycle, reconnection, and cleanup.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface StdioClientConfig {
  /** Unique server identifier */
  serverId: string;
  /** Human-readable server name */
  serverName: string;
  /** Command to spawn (e.g., "npx", "node") */
  command: string;
  /** Arguments for the command */
  args: string[];
  /** Environment variables for the child process */
  env?: Record<string, string>;
}

export interface ToolCallResult {
  content: Array<{
    type: string;
    text?: string;
  }>;
  isError?: boolean;
}

export class McpStdioClient {
  private client: Client;
  private transport: StdioClientTransport | undefined;
  private connected = false;

  readonly serverId: string;
  readonly serverName: string;

  private readonly config: StdioClientConfig;

  constructor(config: StdioClientConfig) {
    this.config = config;
    this.serverId = config.serverId;
    this.serverName = config.serverName;

    this.client = new Client({
      name: "guarded-agent",
      version: "1.0.0",
    });
  }

  /** Connect to the MCP server via stdio. */
  async connect(): Promise<void> {
    if (this.connected) return;

    this.transport = new StdioClientTransport({
      command: this.config.command,
      args: this.config.args,
      env: {
        ...process.env,
        ...this.config.env,
      } as Record<string, string>,
    });

    await this.client.connect(this.transport);
    this.connected = true;

    console.log(`🔗 MCP client connected to "${this.serverName}"`);
  }

  /** Discover all tools exposed by this server. */
  async listTools(): Promise<
    Array<{
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
    }>
  > {
    if (!this.connected) {
      throw new Error(
        `MCP client not connected to "${this.serverName}"`,
      );
    }

    const result = await this.client.listTools();

    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown> | undefined,
    }));
  }

  /** Execute a tool by name with given arguments. */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<ToolCallResult> {
    if (!this.connected) {
      throw new Error(
        `MCP client not connected to "${this.serverName}"`,
      );
    }

    const result = await this.client.callTool({
      name: toolName,
      arguments: args,
    });

    return {
      content: (result.content as ToolCallResult["content"]) ?? [],
      isError: result.isError as boolean | undefined,
    };
  }

  /** Disconnect from the MCP server. */
  async disconnect(): Promise<void> {
    if (!this.connected) return;

    try {
      await this.client.close();
    } catch {
      // Ignore close errors
    }

    this.connected = false;
    console.log(`🔌 MCP client disconnected from "${this.serverName}"`);
  }

  /** Check if the client is connected. */
  isConnected(): boolean {
    return this.connected;
  }
}
