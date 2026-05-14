# Guarded AI Agent — Implementation Plan (Realtime + Lead MCP + Context7)

## OBJECTIVE

Implement:

* realtime frontend activity updates using Socket.io
* lead-mcp fully connected to backend orchestration layer
* Context7 MCP integration
* policy approval realtime sync
* live execution streaming UX
* proper MCP runtime architecture
* event-driven backend

FINAL FLOW:

User Prompt
↓
LLM Agent Runtime
↓
MCP Runtime
↓
lead-mcp tool execution
↓
backend orchestration endpoint
↓
scrapeAndCreateLead()
↓
PostgreSQL save
↓
websocket emit
↓
frontend realtime update

---

# PHASE 1 — BACKEND EVENT SYSTEM

## Goal

Create centralized realtime event architecture.

---

## Create Folder

backend/src/events

Files:

* bus.ts
* register-events.ts
* event-types.ts

---

## bus.ts

Create global event bus using Node EventEmitter.

Responsibilities:

* internal realtime communication
* decouple services from socket transport
* single event backbone

Events should NEVER directly call socket.io.

Services emit to eventBus only.

---

## event-types.ts

Define event payload types.

Required events:

* tool:started
* tool:completed
* tool:failed
* policy:checking
* policy:approval_required
* policy:approved
* policy:rejected
* approval:pending
* approval:resolved
* lead:created
* lead:updated
* lead:deleted
* scrape:phase
* agent:thinking
* agent:responding

---

## register-events.ts

Bridge:

eventBus
↓
socket.io

This file subscribes to internal events and broadcasts them to frontend.

Architecture:

eventBus.on(...)
↓
io.emit(...)

NEVER emit socket events directly inside business services.

---

# PHASE 2 — SOCKET.IO ARCHITECTURE

## Goal

Create production-grade realtime infrastructure.

---

## Create Folder

backend/src/websocket

Files:

* socket.ts
* events.ts

---

## socket.ts

Responsibilities:

* initialize socket.io server
* export getIO()
* manage socket lifecycle

Features:

* CORS enabled
* reconnect support
* rooms support
* future auth support

---

## events.ts

Create helper functions:

emitToolStarted()
emitToolCompleted()
emitPolicyCheck()
emitApprovalPending()
emitApprovalResolved()
emitLeadCreated()

These helpers internally use:

eventBus.emit(...)

NOT io.emit directly.

---

# PHASE 3 — MCP RUNTIME EVENTS

## Goal

Emit realtime execution updates from runtime.

---

## Modify MCP Runtime

backend/src/mcp/runtime.ts

Before tool execution:

Emit:
tool:started

Payload:

* conversationId
* toolName
* serverName
* timestamp

---

## After execution

Emit:
tool:completed

Payload:

* toolName
* latency
* success
* resultSummary

---

## On error

Emit:
tool:failed

Payload:

* toolName
* error
* latency

---

# PHASE 4 — POLICY ENGINE EVENTS

## Goal

Realtime visibility into guardrails.

---

## Modify Policy Engine

backend/src/policy

Emit:

policy:checking
policy:approval_required
policy:approved
policy:rejected

Frontend should instantly show:

🛡 Checking policy...
⏳ Waiting for approval...
✅ Approved
❌ Rejected

---

# PHASE 5 — APPROVAL REALTIME FLOW

## Goal

Realtime chat updates after admin actions.

---

## Modify Approval Routes

backend/src/api/routes/approvals.ts

After approve:

Emit:
approval:resolved

Payload:

* approvalId
* toolCallId
* status
* executionResult

---

## Frontend Behavior

When admin approves:

Chat should instantly update.

NO refresh required.

Message flow:

⏳ Waiting for admin approval...
↓
✅ Admin approved request
↓
⚡ Executing tool...
↓
✅ Download completed

---

# PHASE 6 — LEAD MCP ORCHESTRATION FIX

## Goal

Move MCP to orchestration layer.

IMPORTANT:

lead-mcp MUST NOT touch Prisma directly.

NO database operations inside MCP.

---

## Correct Flow

lead-mcp
↓
backend orchestration endpoint
↓
business service
↓
Prisma

---

## Create Backend Route

backend/src/api/routes/leads.ts

Create:

POST /api/leads/analyze

Request:

{
"url": "https://openai.com"
}

---

## Route Responsibility

Call:

scrapeAndCreateLead(url)

This service should:

* call scraper API
* save PostgreSQL lead
* emit websocket event
* return compact summary

---

## MCP Change

lead-mcp analyze_website tool should call:

http://localhost:4001/api/leads/analyze

NOT:

/api/public/scrape

---

## IMPORTANT

MCP should NEVER:

* access Prisma
* manage DB
* contain business logic

MCP = capability provider only.

---

# PHASE 7 — LEAD REALTIME EVENTS

## Goal

Frontend updates instantly when lead created.

---

## Inside scrapeAndCreateLead()

Emit:

lead:created

Payload:

* leadId
* website
* score
* priority

Frontend:

Immediately add new lead row without refresh.

---

# PHASE 8 — SCRAPER LIVE PROGRESS

## Goal

Make AI feel alive.

---

## Emit phases during scraping

Examples:

scrape:phase

Payloads:

* Fetching website...
* Extracting metadata...
* Detecting technologies...
* Analyzing SEO...
* Calculating lead score...
* Saving lead...

Frontend should render activity timeline.

---

# PHASE 9 — FRONTEND SOCKET LAYER

## Goal

Centralized realtime frontend system.

---

## Install

socket.io-client
zustand

---

## Create

frontend/src/lib/socket.ts

Responsibilities:

* connect socket
* reconnect
* export singleton socket

---

## Create Zustand Store

frontend/src/store/activity.store.ts

Store:

activities[]

Methods:

* addActivity()
* clearActivities()

---

## Activity Shape

{
id,
type,
message,
timestamp,
status
}

---

# PHASE 10 — FRONTEND REALTIME ACTIVITY PANEL

## Goal

Premium AI execution UX.

---

## Create Component

frontend/src/components/activity-panel.tsx

Layout:

Right sidebar or floating panel.

---

## UI Example

🧠 Thinking...

🛡 Checking policy...

⚡ Using analyze_website

🌐 Scraping openai.com

📊 Detecting technologies

💾 Saving lead

✅ Lead created

---

## NEVER allow silent waiting state.

Always stream execution state.

---

# PHASE 11 — CHAT REALTIME EXECUTION

## Goal

Live chat execution updates.

---

## Chat should stream:

* thinking
* policy checks
* tool calls
* approval state
* MCP server name
* execution result

Like Cursor / Claude Code.

---

## Example

User:
Analyze openai.com

Assistant stream:

🧠 Thinking...
🛡 Policy passed
⚡ Using Lead MCP
🌐 Scraping openai.com
📊 Calculating lead score
💾 Saving lead
✅ Lead created successfully

---

# PHASE 12 — CONTEXT7 MCP INTEGRATION

## Goal

Add second MCP server.

---

## Create

backend/src/mcp/servers/context7.ts

Responsibilities:

* stdio connection
* tool discovery
* auto-registration

---

## Runtime Requirement

MCP runtime should dynamically discover tools.

NO hardcoded tool lists.

---

## Required Flow

Runtime startup:
↓
connect MCP server
↓
discover tools
↓
register tools in registry
↓
agent can use immediately

---

# PHASE 13 — TOOL REGISTRY

## Goal

Production-grade MCP discovery system.

---

## Create

backend/src/mcp/tool-registry.ts

Responsibilities:

* register discovered tools
* store metadata
* expose runtime lookup
* avoid hardcoded tools

Tool shape:

{
name,
description,
inputSchema,
serverName
}

---

# PHASE 14 — DATABASE EVENTS

## Goal

Realtime DB lifecycle updates.

---

## Emit events for:

* lead created
* lead updated
* approval created
* approval resolved
* tool executed
* tool failed

Frontend should sync automatically.

---

# PHASE 15 — FRONTEND PAGES

## Chat Page

Realtime execution timeline.

---

## Leads Page

Auto-update lead table.

NO manual refresh.

---

## Policies Page

Realtime policy changes.

---

## Approvals Page

Pending approvals auto-update.

Approve/reject instantly updates chat.

---

# IMPORTANT ARCHITECTURE RULES

## NEVER

* call socket.io directly from services
* use Prisma inside MCP
* hardcode MCP tools
* mix transport with business logic

---

## ALWAYS

service
↓
eventBus
↓
socket layer
↓
frontend

---

# FINAL TARGET UX

The app should feel like:

* Cursor
* Claude Code
* Devin
* Manus

Execution must appear:

* alive
* transparent
* intelligent
* realtime
* agentic

NO frozen waiting UI.
