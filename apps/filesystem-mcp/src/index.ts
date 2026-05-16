/**
 * Filesystem MCP Server — Entry Point.
 *
 * Exposes 5 sandboxed filesystem tools via MCP stdio transport:
 *   - read_file
 *   - write_file
 *   - append_file
 *   - delete_file
 *   - list_files
 *
 * Usage: WORKSPACE_ROOT=/path/to/sandbox npx tsx src/index.ts
 */

import process from "node:process";
import path from "node:path";
import fs from "node:fs/promises";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { FileSecurity } from "./security.js";

// Tool registrations
import { register as registerReadFile } from "./tools/read-file.js";
import { register as registerWriteFile } from "./tools/write-file.js";
import { register as registerAppendFile } from "./tools/append-file.js";
import { register as registerDeleteFile } from "./tools/delete-file.js";
import { register as registerListFiles } from "./tools/list-files.js";

// ─── Configuration ───────────────────────────────────────
const WORKSPACE_ROOT =
  process.argv[2] ||
  "/app/filesystem-mcp/workspace";
const resolvedRoot = path.resolve(WORKSPACE_ROOT);

// ─── Bootstrap ───────────────────────────────────────────

async function main(): Promise<void> {
  // Ensure workspace directory exists
  await fs.mkdir(resolvedRoot, { recursive: true });

  // Initialize security module
  const security = new FileSecurity(resolvedRoot);

  // Create MCP server
  const server = new McpServer({
    name: "filesystem",
    version: "1.0.0",
  });

  // Register all tools
  registerReadFile(server, security);
  registerWriteFile(server, security);
  registerAppendFile(server, security);
  registerDeleteFile(server, security);
  registerListFiles(server, security);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is reserved for MCP protocol)
  console.error(`🗂️  Filesystem MCP server running`);
  console.error(`📁 Workspace: ${resolvedRoot}`);
}

main().catch((err: unknown) => {
  console.error("❌ Filesystem MCP server failed to start:", err);
  process.exit(1);
});
