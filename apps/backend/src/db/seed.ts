/**
 * Seed script — inserts the filesystem MCP server config into the database.
 *
 * Run: npx tsx src/db/seed.ts
 */

import "dotenv/config";
import path from "node:path";
import { getConfig } from "../config/index.js";
import { getPrismaClient, disconnectPrisma } from "./client.js";

async function seed(): Promise<void> {
  const prisma = getPrismaClient();
  const env = getConfig();

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

  const leadMcpPath = path.resolve(
    import.meta.dirname,
    "../../../lead-mcp/src/server.ts",
  );

  await prisma.mcpServer.upsert({
    where: { name: "lead-intelligence" },
    update: {
      command: "npx",
      args: ["tsx", leadMcpPath],
      env: {
        LEAD_API_URL: "http://localhost:8080",
        LEAD_INTELLIGENCE_URL: "http://localhost:8080",
      },
      enabled: true,
    },
    create: {
      name: "lead-intelligence",
      transport: "STDIO",
      command: "npx",
      args: ["tsx", leadMcpPath],
      env: {
        LEAD_API_URL: "http://localhost:8080",
        LEAD_INTELLIGENCE_URL: "http://localhost:8080",
      },
      enabled: true,
      status: "DISCONNECTED",
    },
  });

  console.log("✅ Seeded lead-intelligence MCP server config");
  console.log(`   Command: npx tsx ${leadMcpPath}`);

  const context7Key = env.CONTEXT7_API_KEY ?? "";
  await prisma.mcpServer.upsert({
    where: { name: "context7" },
    update: {
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
      env:
        context7Key.length > 0 ? { CONTEXT7_API_KEY: context7Key } : {},
      enabled: context7Key.length > 0,
    },
    create: {
      name: "context7",
      transport: "STDIO",
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
      env:
        context7Key.length > 0 ? { CONTEXT7_API_KEY: context7Key } : {},
      enabled: context7Key.length > 0,
      status: "DISCONNECTED",
    },
  });

  if (context7Key.length > 0) {
    console.log("✅ Seeded Context7 MCP (enabled — CONTEXT7_API_KEY set)");
  } else {
    console.log("ℹ️  Context7 MCP row upserted but disabled — set CONTEXT7_API_KEY and re-run seed to enable");
  }

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

  await prisma.policyRule.upsert({
    where: { id: "rule-lead-delete" },
    update: {},
    create: {
      id: "rule-lead-delete",
      name: "Approve lead delete",
      description: "Soft-delete requires human approval",
      ruleType: "APPROVAL",
      action: "REQUIRE_APPROVAL",
      toolPattern: "delete_lead",
      serverPattern: "lead-intelligence",
      priority: 80,
      enabled: true,
    },
  });

  await prisma.policyRule.upsert({
    where: { id: "rule-lead-delete-all" },
    update: {},
    create: {
      id: "rule-lead-delete-all",
      name: "Approve delete all leads",
      description: "Critical bulk soft-delete",
      ruleType: "APPROVAL",
      action: "REQUIRE_APPROVAL",
      toolPattern: "delete_all_leads",
      serverPattern: "lead-intelligence",
      priority: 100,
      enabled: true,
    },
  });

  await prisma.policyRule.upsert({
    where: { id: "rule-lead-download" },
    update: {},
    create: {
      id: "rule-lead-download",
      name: "Approve lead export",
      description: "Export may contain sensitive scraped data",
      ruleType: "APPROVAL",
      action: "REQUIRE_APPROVAL",
      toolPattern: "download_lead",
      serverPattern: "lead-intelligence",
      priority: 60,
      enabled: true,
    },
  });

  await prisma.policyRule.upsert({
    where: { id: "rule-lead-update" },
    update: {},
    create: {
      id: "rule-lead-update",
      name: "Approve lead metadata update",
      description: "Optional governance for lead edits",
      ruleType: "APPROVAL",
      action: "REQUIRE_APPROVAL",
      toolPattern: "update_lead",
      serverPattern: "lead-intelligence",
      priority: 40,
      enabled: true,
    },
  });

  console.log("✅ Seeded 4 lead MCP policy rules (lead-intelligence server)");
  await disconnectPrisma();
}

seed().catch((err: unknown) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
