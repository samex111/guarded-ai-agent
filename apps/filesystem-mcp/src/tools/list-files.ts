/**
 * list_files — List files and directories within the workspace sandbox.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type FileSecurity, SecurityError } from "../security.js";

export function register(server: McpServer, security: FileSecurity): void {
  server.tool(
    "list_files",
    "List files and directories at a given path. Path is relative to workspace root. Use '.' or '' for the root.",
    {
      path: z
        .string()
        .default(".")
        .describe("Relative path to list (default: workspace root)"),
    },
    async ({ path: dirPath }) => {
      try {
        const safePath = security.resolve(dirPath);
        const entries = await fs.readdir(safePath, { withFileTypes: true });

        const listing = entries.map((entry) => {
          const type = entry.isDirectory() ? "dir" : "file";
          return `[${type}] ${entry.name}`;
        });

        const header = `Contents of ${dirPath || "."}/ (${entries.length} items):`;
        const result = [header, ...listing].join("\n");

        return {
          content: [{ type: "text" as const, text: result }],
        };
      } catch (err) {
        const message =
          err instanceof SecurityError
            ? `Security: ${err.message}`
            : err instanceof Error
              ? err.message
              : "Unknown error listing files";

        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
