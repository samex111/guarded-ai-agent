/**
 * MCP Tool Registry — in-memory store of all dynamically discovered tools.
 *
 * Keyed by tool name. Each tool maps back to its source MCP server
 * so the runtime can route execution requests to the correct server.
 *
 * No hardcoded tool lists — everything populated via MCP discovery.
 */

export interface RegisteredTool {
  /** Tool name as exposed to the LLM */
  name: string;
  /** Tool description for the LLM system prompt */
  description: string;
  /** JSON Schema for input validation */
  inputSchema: Record<string, unknown>;
  /** ID of the MCP server that provides this tool */
  serverId: string;
  /** Human-readable name of the MCP server */
  serverName: string;
}

/**
 * Format suitable for LLM tool-calling APIs (Groq/OpenAI compatible).
 */
export interface LLMToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export class ToolRegistry {
  /** tool name → tool definition */
  private tools = new Map<string, RegisteredTool>();

  /**
   * Register tools discovered from an MCP server.
   * Replaces any previously registered tools for the same server.
   */
  registerTools(
    serverId: string,
    serverName: string,
    tools: Array<{
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
    }>,
  ): void {
    // Remove old tools from this server first
    this.unregisterServer(serverId);

    for (const tool of tools) {
      const registered: RegisteredTool = {
        name: tool.name,
        description: tool.description ?? "",
        inputSchema: tool.inputSchema ?? { type: "object", properties: {} },
        serverId,
        serverName,
      };

      if (this.tools.has(tool.name)) {
        const existing = this.tools.get(tool.name)!;
        console.warn(
          `⚠️  Tool name collision: "${tool.name}" from "${serverName}" overwrites "${existing.serverName}"`,
        );
      }

      this.tools.set(tool.name, registered);
    }

    console.log(
      `📋 Registered ${tools.length} tools from "${serverName}": [${tools.map((t) => t.name).join(", ")}]`,
    );
  }

  /** Remove all tools belonging to a specific server. */
  unregisterServer(serverId: string): void {
    for (const [name, tool] of this.tools) {
      if (tool.serverId === serverId) {
        this.tools.delete(name);
      }
    }
  }

  /** Get a specific tool by name. */
  getTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /** Get all registered tools. */
  getAllTools(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  /** Get tool count. */
  size(): number {
    return this.tools.size;
  }

  /**
   * Format all tools for LLM tool-calling APIs.
   * Compatible with Groq / OpenAI function calling format.
   */
  getToolsForLLM(): LLMToolDefinition[] {
    return this.getAllTools().map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  /** Check if a tool exists. */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /** Get all unique server IDs that have registered tools. */
  getServerIds(): string[] {
    const ids = new Set<string>();
    for (const tool of this.tools.values()) {
      ids.add(tool.serverId);
    }
    return Array.from(ids);
  }
}
