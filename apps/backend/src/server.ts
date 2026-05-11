/**
 * Server entry point.
 *
 * Wires together: Express → HTTP → Socket.io
 * Initializes: Config → Prisma → Redis → MCP Runtime
 * Handles: Graceful shutdown, unhandled errors
 */

import "dotenv/config";

import http from "node:http";
import process from "node:process";

import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { Server as SocketIOServer } from "socket.io";

import { getConfig } from "./config/index.js";
import { getPrismaClient, disconnectPrisma } from "./db/client.js";
import { getRedis, disconnectAllRedis } from "./db/redis.js";
import { getMcpRuntime } from "./mcp/runtime.js";
import { initializePolicyEngine } from "./policy/engine.js";
import { conversationRouter } from "./api/routes/conversations.js";
import { policyRouter } from "./api/routes/policies.js";
import { approvalRouter } from "./api/routes/approvals.js";
import { mcpRouter } from "./api/routes/mcp-servers.js";
import { auditRouter } from "./api/routes/audit.js";
import { setSocketIO } from "./websocket/events.js";

/* ======================================================
   CONFIG (validated via Zod — fails fast)
====================================================== */

const config = getConfig();

/* ======================================================
   EXPRESS APP
====================================================== */

const app = express();

/* ======================================================
   MIDDLEWARE
====================================================== */

app.use(
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
  }),
);

/* ======================================================
   HEALTH CHECK
====================================================== */

app.get("/health", (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    status: "ok",
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/* ======================================================
   API ROUTES
====================================================== */

app.get("/", (_req: Request, res: Response) => {
  return res.json({
    message: "Guarded AI Agent API 🚀",
  });
});

app.use("/api/conversations", conversationRouter);
app.use("/api/policies", policyRouter);
app.use("/api/approvals", approvalRouter);
app.use("/api/mcp", mcpRouter);
app.use("/api/audit", auditRouter);

/* ======================================================
   404 HANDLER
====================================================== */

app.use((_req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ======================================================
   CENTRALIZED ERROR HANDLER
====================================================== */

export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);

    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

app.use(
  (
    error: Error | AppError,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    console.error("ERROR:", error);

    const statusCode =
      error instanceof AppError ? error.statusCode : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        config.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  },
);

/* ======================================================
   HTTP SERVER
====================================================== */

const httpServer = http.createServer(app);

/* ======================================================
   SOCKET.IO
====================================================== */

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.CLIENT_URL,
    credentials: true,
  },
});

// Register Socket.io for centralized event emitting
setSocketIO(io);

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.emit("connected", {
    message: "Socket.io connected successfully",
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

/* ======================================================
   BOOTSTRAP — Initialize DB + Redis + MCP, then listen
====================================================== */

async function bootstrap(): Promise<void> {
  // 1. Prisma — connect eagerly to catch DB issues at startup
  const prisma = getPrismaClient();
  await prisma.$connect();
  console.log("✅ PostgreSQL connected (Prisma)");

  // 2. Redis — ping to verify connection
  const redis = getRedis();
  await redis.ping();
  console.log("✅ Redis connected");

  // 3. Policy Engine — load rules + subscribe to pub/sub
  await initializePolicyEngine();

  // 4. MCP Runtime — connect to MCP servers + discover tools
  const mcpRuntime = getMcpRuntime();
  await mcpRuntime.initialize();

  // 5. Start HTTP server
  httpServer.listen(config.PORT, () => {
    const toolCount = mcpRuntime.getRegistry().size();
    console.log(`
🚀 Guarded AI Agent — Backend
🌍 Environment : ${config.NODE_ENV}
📦 Port        : ${config.PORT}
🔗 Client URL  : ${config.CLIENT_URL}
🔧 MCP Tools   : ${toolCount} discovered
`);
  });
}

bootstrap().catch((err: unknown) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});

/* ======================================================
   GRACEFUL SHUTDOWN
====================================================== */

const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  httpServer.close(() => {
    console.log("HTTP server closed.");
  });

  io.close(() => {
    console.log("Socket.io server closed.");
  });

  // Shutdown MCP before DB (MCP persists status to DB)
  await getMcpRuntime().shutdown();
  console.log("MCP Runtime shut down.");

  await disconnectPrisma();
  console.log("Prisma disconnected.");

  await disconnectAllRedis();
  console.log("Redis disconnected.");

  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

/* ======================================================
   UNHANDLED ERRORS
====================================================== */

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);

  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);

  process.exit(1);
});

/* ======================================================
   EXPORTS (for route mounting in later phases)
====================================================== */

export { app, httpServer };