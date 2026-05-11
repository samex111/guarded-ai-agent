/**
 * append_file — Append content to a file within the workspace sandbox.
 * Creates the file if it doesn't exist.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type FileSecurity, SecurityError } from "../security.js";

export function register(server: McpServer, security: FileSecurity): void {
  server.tool(
    "append_file",
    "Append content to a file. Creates the file if it doesn't exist. Path is relative to workspace root.",
    {
      path: z.string().describe("Relative path to the file"),
      content: z.string().describe("Content to append to the file"),
    },
    async ({ path: filePath, content }) => {
      try {
        const safePath = security.resolve(filePath);

        await fs.mkdir(path.dirname(safePath), { recursive: true });
        await fs.appendFile(safePath, content, "utf-8");

        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully appended ${content.length} characters to ${filePath}`,
            },
          ],
        };
      } catch (err) {
        const message =
          err instanceof SecurityError
            ? `Security: ${err.message}`
            : err instanceof Error
              ? err.message
              : "Unknown error appending to file";

        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
