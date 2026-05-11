# Guarded AI Agent with MCP Support

## Overview

This project is a production-style AI agent platform that integrates:

- MCP servers
- AI agent orchestration
- policy/guardrail enforcement
- realtime approvals
- dynamic tool discovery
- audit logging

The system is designed around the principle:

> The LLM can propose actions, but deterministic systems authorize actions.

---

# Core Architecture

```txt
Frontend (Next.js)
        │
        ▼
Express API + Socket.io
        │
        ▼
Agent Runtime
        │
        ▼
Policy Engine
        │
        ▼
BullMQ Queues
        │
        ▼
MCP Runtime
        │
 ┌──────┴──────┐
 ▼             ▼
Filesystem     Remote MCP
MCP            (Context7/Exa)
```

---

# Tech Stack

## Backend

- Express.js
- TypeScript
- Socket.io
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Zod
- Groq SDK
- MCP SDK

## Frontend

- Next.js
- Tailwind CSS
- Socket.io Client

## Infrastructure

- PostgreSQL
- Redis
- BullMQ workers

---

# System Goals

## AI Agent

- Proper tool-use loop
- MCP tool execution
- Dynamic tool discovery
- Conversation memory
- Retry-safe orchestration

## Policy Engine

- Allow / deny / approval
- Input validation
- Realtime rule updates
- Risk scoring
- Audit logging
- Human approval workflows

## MCP Runtime

- Dynamic discovery
- stdio transport
- Tool registry
- Reconnect handling
- Plug-and-play MCP servers

## Dashboard

- Policy management
- Approval queue
- Audit logs
- MCP server visibility
- Conversation tracing

---

# Project Structure

```txt
apps/
│
├── backend/
│
├── frontend/
│
└── filesystem-mcp/
```

---

# Backend Structure

```txt
backend/src/
│
├── agent/
│   ├── agent-loop.ts
│   ├── tool-executor.ts
│   └── memory.ts
│
├── policy/
│   ├── engine.ts
│   ├── validators.ts
│   ├── approvals.ts
│   ├── matcher.ts
│   ├── cache.ts
│   └── audit.ts
│
├── mcp/
│   ├── runtime.ts
│   ├── registry.ts
│   ├── stdio-client.ts
│   └── discovery.ts
│
├── queues/
│   ├── tool.queue.ts
│   ├── approval.queue.ts
│   ├── audit.queue.ts
│   └── workers/
│
├── websocket/
│   ├── socket.ts
│   └── events.ts
│
├── api/
│   ├── routes/
│   ├── controllers/
│   └── middleware/
│
├── db/
│
├── config/
│
├── app.ts
│
└── server.ts
```

---

# Core Principles

## 1. LLM Is Untrusted

The model can:

- suggest actions
- reason about workflows

The model CANNOT:

- bypass policies
- execute tools directly
- access unrestricted systems

---

## 2. Policy Engine Is Deterministic

All tool requests pass through:

```txt
Tool Request
     ↓
Validation
     ↓
Rule Matching
     ↓
Risk Evaluation
     ↓
ALLOW / DENY / APPROVAL
```

---

## 3. Dynamic MCP Discovery

No hardcoded tools.

Flow:

```txt
Connect MCP Server
        ↓
tools/list
        ↓
register tools dynamically
        ↓
expose tools to LLM
```

---

# Agent Runtime Flow

```txt
User Message
      ↓
LLM Response
      ↓
Tool Call
      ↓
Policy Engine
      ↓
If allowed:
Execute MCP Tool
      ↓
Tool Result
      ↓
Back to LLM
      ↓
Final Response
```

---

# Policy Engine

## Features

- allow/deny rules
- approval requirements
- input validation
- path traversal protection
- audit logs
- realtime updates
- risk scoring

---

# Rule Priority

Security-first ordering:

```txt
DENY > APPROVAL > ALLOW
```

---

# Filesystem Validation

All filesystem tools are sandboxed.

Example blocked paths:

- /etc
- /system
- ../../../

---

# Approval Workflow

## Flow

```txt
Dangerous Tool Request
         ↓
Pending Approval
         ↓
Dashboard Notification
         ↓
Approve / Reject
         ↓
Resume Workflow
```

---

# BullMQ Queues

## Queues

### tool-execution

Handles MCP tool execution.

### approval-expiration

Expires pending approvals.

### audit-logs

Async audit logging.

### notifications

Realtime websocket events.

---

# Redis Usage

Redis is used for:

- BullMQ
- websocket scaling
- policy cache invalidation
- realtime events

---

# Socket.io Events

## Events

### approval:created

New approval request.

### approval:approved

Approval accepted.

### approval:rejected

Approval rejected.

### policy:updated

Realtime policy refresh.

### tool:started

Tool execution started.

### tool:completed

Tool execution completed.

### tool:failed

Tool execution failed.

---

# Database Schema

## Tables

### users

Admin/auth users.

### conversations

Conversation sessions.

### messages

LLM/user/tool messages.

### tool_calls

Tracks all tool execution.

### policy_rules

Guardrail rules.

### pending_approvals

Approval workflow state.

### audit_logs

Decision and execution logs.

### mcp_servers

Registered MCP servers.

### mcp_tools

Discovered MCP tools.

---

# Custom MCP Server

## Filesystem MCP

### Tools

- read_file
- write_file
- append_file
- delete_file
- list_files

---

# Filesystem Security

- path traversal protection
- zod validation
- workspace sandbox
- structured errors

---

# Remote MCP Server

Will integrate:

- Context7 OR
- Exa MCP

---

# Realtime Requirements

Dashboard changes must affect running agents instantly.

Implementation:

```txt
Dashboard
    ↓
Postgres Update
    ↓
Redis Pub/Sub
    ↓
Socket.io Broadcast
    ↓
Policy Cache Refresh
```

---

# Edge Cases

## MCP Crash

Handled via:

- retries
- queue failures
- timeouts
- reconnect logic

---

## Prompt Injection

Policies enforced OUTSIDE LLM.

LLM cannot bypass deterministic validation.

---

## Rule Conflicts

Priority system:

```txt
DENY > APPROVAL > ALLOW
```

---

## Approver Offline

Pending approvals persist in PostgreSQL.

Expired approvals auto-reject.

---

# Production Features

## Observability

- audit logs
- tool latency
- token usage
- queue metrics
- websocket events

---

## Reliability

- retries
- graceful shutdown
- async workers
- reconnect handling
- queue durability

---

# Development Plan

## Phase 1

- backend setup
- prisma schema
- redis/bullmq
- express server

## Phase 2

- filesystem MCP server
- MCP runtime
- dynamic discovery

## Phase 3

- policy engine
- approval workflows
- audit logs

## Phase 4

- agent loop
- tool execution
- memory handling

## Phase 5

- frontend dashboard
- realtime websocket sync

## Phase 6

- deployment
- testing
- observability

---

# Assignment Mapping

## Requirement: Dynamic Tool Discovery

Implemented via MCP runtime + tool registry.

---

## Requirement: Separate Policy Engine

Implemented as isolated policy module.

---

## Requirement: Realtime Dashboard Rules

Implemented via Redis + Socket.io.

---

## Requirement: Custom MCP Server

Implemented as Filesystem MCP server.

---

# Final Philosophy

This project treats the AI model as:

```txt
an intelligent planner
```

NOT:

```txt
a trusted execution engine
```

Deterministic systems control permissions, validation, execution, and governance.