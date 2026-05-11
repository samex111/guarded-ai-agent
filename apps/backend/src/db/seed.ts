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

  // ─── Seed Sample Policy Rules ────────────────────────────

  // Rule 1: Block delete_file entirely
  await prisma.policyRule.upsert({
    where: { id: "rule-block-delete" },
    update: {},
    create: {
      id: "rule-block-delete",
      name: "Block file deletion",
      description: "Prevent the agent from deleting any files",
      ruleType: "BLOCK",
      action: "DENY",
      toolPattern: "delete_file",
      priority: 100,
      enabled: true,
    },
  });

  // Rule 2: Require approval for write_file
  await prisma.policyRule.upsert({
    where: { id: "rule-approve-write" },
    update: {},
    create: {
      id: "rule-approve-write",
      name: "Approve file writes",
      description: "Require human approval before writing files",
      ruleType: "APPROVAL",
      action: "REQUIRE_APPROVAL",
      toolPattern: "write_file",
      priority: 50,
      enabled: true,
    },
  });

  // Rule 3: Validate file paths for read operations
  await prisma.policyRule.upsert({
    where: { id: "rule-validate-paths" },
    update: {},
    create: {
      id: "rule-validate-paths",
      name: "Validate file paths",
      description: "Ensure read paths have required arguments",
      ruleType: "VALIDATION",
      action: "ALLOW",
      toolPattern: "read_*",
      conditions: {
        requiredArgs: ["path"],
      },
      priority: 10,
      enabled: true,
    },
  });

  console.log("✅ Seeded 3 sample policy rules");
  console.log("   1. Block delete_file (DENY)");
  console.log("   2. Approve write_file (REQUIRE_APPROVAL)");
  console.log("   3. Validate read_* paths (VALIDATION)");

  await disconnectPrisma();
}

seed().catch((err: unknown) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
