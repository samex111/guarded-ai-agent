Guarded AI Agent

Production-style AI agent platform with MCP server support, dynamic tool discovery, policy guardrails, realtime approvals, Dockerized infrastructure, and AI tool orchestration.

The system allows LLMs to securely interact with tools through a governed execution pipeline with audit logging, approval workflows, and runtime policy enforcement.


---

Features

MCP (Model Context Protocol) server integration

Dynamic runtime tool discovery

AI agent tool-use loop

Policy guardrails system

Human approval workflows

Realtime updates with Socket.io

Redis + BullMQ workers

PostgreSQL + Prisma ORM

Dockerized production architecture

Filesystem sandbox MCP server

Lead intelligence MCP server

Context7 MCP integration

Realtime conversation logs

Cost/token tracking

Queue-based background processing

Production-ready backend structure



---

Architecture

Frontend (Next.js)
        ↓
Backend API (Node.js + Express)
        ↓
AI Agent Runtime
        ↓
Policy Engine
        ↓
MCP Runtime
        ↓
Filesystem MCP | Lead MCP | Context7 MCP
        ↓
Redis + PostgreSQL


---

Tech Stack

Frontend

Next.js

React

TypeScript

Tailwind CSS

shadcn/ui

Socket.io Client


Backend

Node.js

Express

TypeScript

Prisma

PostgreSQL

Redis

BullMQ

Socket.io

Zod


AI / MCP

Groq API

MCP SDK

Context7 MCP

Custom MCP Servers


DevOps

Docker

Docker Compose



---

MCP Servers

Filesystem MCP

Sandboxed filesystem MCP server exposing:

read_file

write_file

append_file

delete_file

list_files


Includes:

path traversal protection

sandbox enforcement

blocked sensitive file access

secure file operations



---

Lead Intelligence MCP

AI-powered lead intelligence MCP server capable of:

website analysis

business data extraction

lead enrichment

lead storage

lead updates

lead exports


Powered using:

Puppeteer

Cheerio

Redis queues

AI summarization



---

Context7 MCP

Integrated external MCP server for runtime documentation retrieval.


---

Policy Engine

The policy engine sits between the AI agent and MCP tools.

It enforces:

tool blocking

approval requirements

input validation rules

sandbox restrictions

runtime policy updates


Example policies:

- Block delete_file tool
- Require approval for write_file
- Restrict filesystem access to workspace/

Policies update in realtime without restarting the backend.


---

Realtime System

Socket.io powers:

live conversation updates

approval requests

execution status updates

tool execution logs

policy update propagation



---

Dockerized Infrastructure

The entire system runs in Docker containers.

Services:

frontend

backend

postgres

redis


Benefits:

reproducible environments

isolated services

production consistency

simplified deployment



---

Environment Variables

Backend

DATABASE_URL=postgresql://postgres:password@postgres:5432/guarded_ai
REDIS_URL=redis://redis:6379
CLIENT_URL=http://localhost:3000
GROQ_API_KEY=your_api_key
SCRAPER_SERVICE_URL=http://host.docker.internal:4001

Frontend

NEXT_PUBLIC_API_URL=http://localhost:8080


---

Running Locally

Clone Repository

git clone https://github.com/samex111/Guarded-Ai-Agent.git
cd Guarded-Ai-Agent


---

Start with Docker

docker compose up --build


---

Backend

Runs on:

http://localhost:8080


---

Frontend

Runs on:

http://localhost:3000


---

Database

Prisma Studio:

cd apps/backend
npx prisma studio


---

Key Engineering Concepts Implemented

Runtime MCP discovery

AI tool orchestration

Policy-based execution control

Queue-based processing

Realtime event systems

Containerized infrastructure

Filesystem sandboxing

Dynamic tool registration

Redis pub/sub architecture

Production-style backend separation



---

Challenges Solved

During development, several production-style engineering issues were solved:

Docker networking issues

Windows vs Linux path conflicts

MCP stdio runtime failures

Container filesystem permissions

Redis container communication

Prisma migration/runtime issues

Dynamic MCP tool loading

Environment isolation bugs

Docker build context problems

Service discovery and runtime orchestration



---

Future Improvements

Kubernetes deployment

Multi-agent orchestration

Role-based access control

OpenTelemetry tracing

Advanced prompt injection protection

Persistent approval workflows

Distributed MCP execution

Observability dashboard



---

Author

Sameer

GitHub:

https://github.com/samex111