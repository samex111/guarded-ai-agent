-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'TOOL');

-- CreateEnum
CREATE TYPE "ToolCallStatus" AS ENUM ('PENDING', 'POLICY_BLOCKED', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PolicyAction" AS ENUM ('DENY', 'REQUIRE_APPROVAL', 'ALLOW');

-- CreateEnum
CREATE TYPE "PolicyRuleType" AS ENUM ('BLOCK', 'APPROVAL', 'VALIDATION');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "McpTransport" AS ENUM ('STDIO', 'SSE');

-- CreateEnum
CREATE TYPE "McpServerStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('TOOL_REQUESTED', 'TOOL_ALLOWED', 'TOOL_BLOCKED', 'TOOL_APPROVAL_REQUIRED', 'TOOL_APPROVED', 'TOOL_REJECTED', 'TOOL_EXECUTED', 'TOOL_FAILED', 'POLICY_CREATED', 'POLICY_UPDATED', 'POLICY_DELETED', 'POLICY_TOGGLED', 'MCP_SERVER_CONNECTED', 'MCP_SERVER_DISCONNECTED', 'MCP_SERVER_ERROR', 'CONVERSATION_CREATED', 'APPROVAL_EXPIRED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('TEMPORARY', 'SAVED');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "EmailQuality" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Conversation',
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT,
    "toolCallId" TEXT,
    "toolName" TEXT,
    "tokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_calls" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "serverName" TEXT NOT NULL,
    "arguments" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "status" "ToolCallStatus" NOT NULL DEFAULT 'PENDING',
    "policyDecision" TEXT,
    "error" TEXT,
    "latencyMs" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ruleType" "PolicyRuleType" NOT NULL,
    "action" "PolicyAction" NOT NULL,
    "toolPattern" TEXT NOT NULL,
    "serverPattern" TEXT,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_approvals" (
    "id" TEXT NOT NULL,
    "toolCallId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "policyRuleId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "arguments" JSONB NOT NULL DEFAULT '{}',
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "toolCallId" TEXT,
    "policyRuleId" TEXT,
    "eventType" "AuditEventType" NOT NULL,
    "toolName" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "transport" "McpTransport" NOT NULL,
    "command" TEXT,
    "args" JSONB NOT NULL DEFAULT '[]',
    "url" TEXT,
    "env" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "McpServerStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_tools" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "inputSchema" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "email" TEXT,
    "emailQuality" "EmailQuality",
    "phone" TEXT,
    "businessType" TEXT,
    "industry" TEXT,
    "leadScore" INTEGER NOT NULL DEFAULT 0,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "priority" "LeadPriority",
    "logo" TEXT,
    "screenshot" TEXT,
    "keywords" TEXT,
    "pages" JSONB,
    "socials" JSONB,
    "technologies" JSONB,
    "seo" JSONB,
    "performance" JSONB,
    "rawData" JSONB,
    "isEnriched" BOOLEAN NOT NULL DEFAULT false,
    "enrichedAt" TIMESTAMP(3),
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "tags" TEXT[],
    "exportedAt" TIMESTAMP(3),
    "exportCount" INTEGER NOT NULL DEFAULT 0,
    "status" "LeadStatus" NOT NULL DEFAULT 'TEMPORARY',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_usage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "inputCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "tool_calls_conversationId_idx" ON "tool_calls"("conversationId");

-- CreateIndex
CREATE INDEX "tool_calls_status_idx" ON "tool_calls"("status");

-- CreateIndex
CREATE INDEX "policy_rules_enabled_idx" ON "policy_rules"("enabled");

-- CreateIndex
CREATE INDEX "policy_rules_action_idx" ON "policy_rules"("action");

-- CreateIndex
CREATE UNIQUE INDEX "pending_approvals_toolCallId_key" ON "pending_approvals"("toolCallId");

-- CreateIndex
CREATE INDEX "pending_approvals_status_idx" ON "pending_approvals"("status");

-- CreateIndex
CREATE INDEX "pending_approvals_conversationId_idx" ON "pending_approvals"("conversationId");

-- CreateIndex
CREATE INDEX "audit_logs_eventType_idx" ON "audit_logs"("eventType");

-- CreateIndex
CREATE INDEX "audit_logs_conversationId_idx" ON "audit_logs"("conversationId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_servers_name_key" ON "mcp_servers"("name");

-- CreateIndex
CREATE INDEX "mcp_tools_serverId_idx" ON "mcp_tools"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_tools_serverId_name_key" ON "mcp_tools"("serverId", "name");

-- CreateIndex
CREATE INDEX "leads_status_expiresAt_idx" ON "leads"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "leads_deletedAt_idx" ON "leads"("deletedAt");

-- CreateIndex
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");

-- CreateIndex
CREATE INDEX "conversation_usage_conversationId_idx" ON "conversation_usage"("conversationId");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_approvals" ADD CONSTRAINT "pending_approvals_toolCallId_fkey" FOREIGN KEY ("toolCallId") REFERENCES "tool_calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_approvals" ADD CONSTRAINT "pending_approvals_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_approvals" ADD CONSTRAINT "pending_approvals_policyRuleId_fkey" FOREIGN KEY ("policyRuleId") REFERENCES "policy_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_toolCallId_fkey" FOREIGN KEY ("toolCallId") REFERENCES "tool_calls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_policyRuleId_fkey" FOREIGN KEY ("policyRuleId") REFERENCES "policy_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_tools" ADD CONSTRAINT "mcp_tools_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "mcp_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
