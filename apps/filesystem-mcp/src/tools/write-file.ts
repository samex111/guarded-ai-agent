/**
 * write_file — Write content to a file within the workspace sandbox.
 * Creates parent directories if they don't exist.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type FileSecurity, SecurityError } from "../security.js";

export function register(server: McpServer, security: FileSecurity): void {
  server.tool(
    "write_file",
    "Write content to a file. Creates the file and parent directories if they don't exist. Path is relative to workspace root.",
    {
      path: z.string().describe("Relative path to the file to write"),
      content: z.string().describe("Content to write to the file"),
    },
    async ({ path: filePath, content }) => {
      try {
        const safePath = security.resolve(filePath);

        // Ensure parent directory exists
        await fs.mkdir(path.dirname(safePath), { recursive: true });
        await fs.writeFile(safePath, content, "utf-8");

        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully wrote ${content.length} characters to ${filePath}`,
            },
          ],
        };
      } catch (err) {
        const message =
          err instanceof SecurityError
            ? `Security: ${err.message}`
            : err instanceof Error
              ? err.message
              : "Unknown error writing file";

        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
