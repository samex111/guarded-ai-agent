# Lead Intelligence MCP + Policy Engine + Realtime Workflow Plan

## Goal

Build a production-grade Lead Intelligence MCP system with:

* MCP tools for lead workflows
* Policy engine with approvals
* Realtime approval dashboard
* Lead lifecycle management
* WebSocket/Socket.io realtime events
* BullMQ background workflows
* PostgreSQL persistence

This system should feel like governed AI workflow infrastructure.

---

# Existing System

Already completed:

* Express backend
* MCP runtime
* File-system MCP
* Agent loop
* PostgreSQL
* Redis
* BullMQ foundation

This plan focuses ONLY on:

* Lead MCP server
* Policy engine
* Realtime updates
* Approval workflows

---

# Architecture

AI Agent
↓
Policy Engine
↓
Lead MCP Server
↓
Lead Intelligence API (localhost:4001)

Supporting:

* PostgreSQL
* Redis
* BullMQ
* Socket.io

---

# Lead MCP Server

Create:

apps/lead-mcp/

Structure:

src/
├── tools/
├── services/
├── types/
├── validators/
├── db/
├── utils/
└── server.ts

---

# MCP Tools

## 1. analyze_website

Input:
{
"url": "https://example.com"
}

Behavior:

* Call:
  http://localhost:4001/api/public/scrape
* Persist temporary lead artifact
* expiresAt = now + 24h
* status = TEMPORARY
* Emit websocket event

Return compact summary only.

Response:
{
"leadId": "...",
"name": "...",
"leadScore": 90,
"priority": "HIGH",
"confidence": 85,
"expiresIn": "24h"
}

IMPORTANT:
Never return huge raw payloads to LLM.

Store full payload in PostgreSQL JSONB.

---

## 2. show_leads

Returns:

* paginated lead summaries
* filters
* sorting

Safe low-risk tool.

---

## 3. get_lead

Returns full lead artifact.

---

## 4. save_lead

Behavior:

* remove expiresAt
* status = SAVED

This converts temporary artifact into durable artifact.

---

## 5. update_lead

Allows:

* notes
* tags
* pinning

Optional approval based on policy.

---

## 6. download_lead

Behavior:

* policy engine intercepts
* approval required
* export generated after approval

---

## 7. delete_lead

Behavior:

* soft delete only
* requires approval

Use:
deletedAt timestamp

NOT hard delete.

---

## 8. delete_all_leads

Critical operation.

Requires:

* approval
* confirmation phrase
* audit logging

---

# Database Schema

## Lead

Should support:

* temporary leads
* permanent leads
* soft deletes
* TTL expiration
* export tracking
* auditability

Fields:

* id
* website
* leadScore
* confidence
* priority
* status
* data JSONB
* expiresAt
* deletedAt
* exportCount
* createdAt
* updatedAt

---

# Lead Lifecycle

analyze_website
↓
temporary artifact created
↓
expiresAt = now + 24h
↓
frontend notification:
"Save permanently?"
↓
if saved:
status = SAVED
↓
if not:
cleanup worker auto-deletes

---

# Policy Engine

Create isolated module:

backend/src/policy/

Structure:

policy/
├── engine.ts
├── evaluator.ts
├── matcher.ts
├── risk.ts
├── cache.ts
├── types.ts
└── rules/

---

# Policy Engine Responsibilities

* allow/deny decisions
* approval requirements
* risk classification
* rule evaluation
* audit logging
* realtime updates

---

# Risk Model

## LOW

* analyze_website
* show_leads

Auto-allow.

---

## MEDIUM

* download_lead
* update_lead

Approval optional.

---

## HIGH

* delete_lead

Approval required.

---

## CRITICAL

* delete_all_leads

Approval + confirmation phrase required.

---

# Policy Evaluation Flow

Tool Request
↓
Rule Matching
↓
Risk Evaluation
↓
Decision
↓
ALLOW / DENY / APPROVAL

---

# Approval Workflow

Sensitive Tool
↓
Policy Engine
↓
pending_approvals table
↓
Socket.io notification
↓
Frontend approval dashboard
↓
Approve / Reject
↓
Resume workflow

---

# Approval Table

Fields:

* id
* toolName
* leadId
* status
* requestedBy
* approvedBy
* expiresAt
* createdAt

---

# BullMQ Queues

## website-analysis

Lead scraping jobs.

---

## approval-workflows

Approval orchestration.

---

## lead-cleanup

Delete expired temporary leads.

---

## exports

Generate downloadable files.

---

## notifications

Realtime websocket broadcasts.

---

# Socket.io Realtime Layer

Use:

* Socket.io
* Redis adapter

Architecture:

Frontend
↕
Socket.io
↕
Express Backend
↕
Redis Pub/Sub
↕
Workers

---

# Realtime Events

## Lead Events

lead:created
lead:updated
lead:deleted
lead:saved

---

## Approval Events

approval:created
approval:approved
approval:rejected

---

## Policy Events

policy:updated

---

## Agent Events

tool:started
tool:completed
tool:failed

---

# Frontend Features

## Leads Dashboard

* all leads
* search/filter
* save/delete/download actions
* lead details modal

---

## Approval Queue

* pending approvals
* approve/reject actions
* approval metadata
* realtime updates

---

## Policy Dashboard

* create/update policy rules
* toggle rules
* risk level management

---

# Important Architectural Rules

## 1. Never store giant artifacts in chat memory

Only:

* leadId
* compact summaries

Full payload stays in PostgreSQL.

---

## 2. Policy engine MUST be separate

Never mix policy logic into:

* agent loop
* MCP tools
* controllers

---

## 3. Lead artifacts are source of truth

NOT:

* chat history
* frontend state

---

## 4. All destructive actions should use soft delete

Never immediate hard delete.

---

## 5. Use BullMQ for async workflows

Do NOT block HTTP requests.

---

# Production-Grade Goals

The system should demonstrate:

* governed AI workflows
* human-in-the-loop approvals
* artifact lifecycle management
* realtime orchestration
* MCP capability systems
* policy-driven execution
* enterprise-grade architecture
