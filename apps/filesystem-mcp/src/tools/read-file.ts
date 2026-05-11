/**
 * read_file — Read contents of a file within the workspace sandbox.
 */

import fs from "node:fs/promises";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type FileSecurity, SecurityError } from "../security.js";

export function register(server: McpServer, security: FileSecurity): void {
  server.tool(
    "read_file",
    "Read the contents of a file. Path is relative to workspace root.",
    {
      path: z.string().describe("Relative path to the file to read"),
    },
    async ({ path: filePath }) => {
      try {
        const safePath = security.resolve(filePath);
        const content = await fs.readFile(safePath, "utf-8");

        return {
          content: [{ type: "text" as const, text: content }],
        };
      } catch (err) {
        const message =
          err instanceof SecurityError
            ? `Security: ${err.message}`
            : err instanceof Error
              ? err.message
              : "Unknown error reading file";

        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
