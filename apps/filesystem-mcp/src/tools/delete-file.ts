/**
 * delete_file — Delete a file within the workspace sandbox.
 */

import fs from "node:fs/promises";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type FileSecurity, SecurityError } from "../security.js";

export function register(server: McpServer, security: FileSecurity): void {
  server.tool(
    "delete_file",
    "Delete a file. Path is relative to workspace root.",
    {
      path: z.string().describe("Relative path to the file to delete"),
    },
    async ({ path: filePath }) => {
      try {
        const safePath = security.resolve(filePath);

        // Verify file exists before deleting
        await fs.access(safePath);
        await fs.unlink(safePath);

        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully deleted ${filePath}`,
            },
          ],
        };
      } catch (err) {
        const message =
          err instanceof SecurityError
            ? `Security: ${err.message}`
            : err instanceof Error
              ? err.message
              : "Unknown error deleting file";

        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
