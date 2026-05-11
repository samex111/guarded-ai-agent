/**
 * Seed script — inserts the filesystem MCP server config into the database.
 *
 * Run: npx tsx src/db/seed.ts
 */

import "dotenv/config";
import path from "node:path";
import { getPrismaClient, disconnectPrisma } from "./client.js";

async function seed(): Promise<void> {
  const prisma = getPrismaClient();

  // Resolve the filesystem-mcp server path
  const mcpServerPath = path.resolve(
    import.meta.dirname,
    "../../../filesystem-mcp/src/index.ts",
  );

  const workspacePath = path.resolve(
    import.meta.dirname,
    "../../../filesystem-mcp/workspace",
  );

  // Upsert the filesystem MCP server
  await prisma.mcpServer.upsert({
    where: { name: "filesystem" },
    update: {
      command: "npx",
      args: ["tsx", mcpServerPath],
      env: { WORKSPACE_ROOT: workspacePath },
      enabled: true,
    },
    create: {
      name: "filesystem",
      transport: "STDIO",
      command: "npx",
      args: ["tsx", mcpServerPath],
      env: { WORKSPACE_ROOT: workspacePath },
      enabled: true,
      status: "DISCONNECTED",
    },
  });

  console.log("✅ Seeded filesystem MCP server config");
  console.log(`   Command: npx tsx ${mcpServerPath}`);
  console.log(`   Workspace: ${workspacePath}`);

  await disconnectPrisma();
}

seed().catch((err: unknown) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
