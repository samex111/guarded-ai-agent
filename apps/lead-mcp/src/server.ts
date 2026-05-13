/**
 * Lead Intelligence MCP — stdio server.
 *
 * Env:
 *   LEAD_API_URL           — backend base (default http://localhost:8080)
 *   LEAD_INTELLIGENCE_URL  — scrape endpoint base (default = LEAD_API_URL; use http://localhost:4001 if INTELLIGENCE_PORT is enabled)
 */

import process from "node:process";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerLeadTools } from "./tools/register-lead-tools.js";

async function main(): Promise<void> {
  const server = new McpServer({
    name: "lead-intelligence",
    version: "1.0.0",
  });

  registerLeadTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("📇 Lead MCP server running (stdio)");
  console.error(`   LEAD_API_URL: ${process.env["LEAD_API_URL"] ?? "(default http://localhost:8080)"}`);
  console.error(
    `   LEAD_INTELLIGENCE_URL: ${process.env["LEAD_INTELLIGENCE_URL"] ?? "(same as LEAD_API_URL)"}`,
  );
}

main().catch((err: unknown) => {
  console.error("❌ Lead MCP failed:", err);
  process.exit(1);
});
