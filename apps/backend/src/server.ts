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
import { z } from "zod";

/* ======================================================
   ENV VALIDATION
====================================================== */

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().default(8080),

  CLIENT_URL: z.string().url().default("http://localhost:3000"),
});

const env = envSchema.parse(process.env);

/* ======================================================
   EXPRESS APP
====================================================== */

const app = express();

/* ======================================================
   MIDDLEWARE
====================================================== */

app.use(
  cors({
    origin: env.CLIENT_URL,
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
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/* ======================================================
   API ROUTES
====================================================== */

app.get("/", (_req: Request, res: Response) => {
  return res.json({
    message: "Server running 🚀",
  });
});

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

class AppError extends Error {
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
        env.NODE_ENV === "production"
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
    origin: env.CLIENT_URL,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.emit("connected", {
    message: "Socket.io connected successfully",
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

/* ======================================================
   START SERVER
====================================================== */

const server = httpServer.listen(env.PORT, () => {
  console.log(`
🚀 Server running
🌍 Environment : ${env.NODE_ENV}
📦 Port        : ${env.PORT}
`);
});

/* ======================================================
   GRACEFUL SHUTDOWN
====================================================== */

const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(() => {
    console.log("HTTP server closed.");

    io.close(() => {
      console.log("Socket.io server closed.");

      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error("Forced shutdown.");

    process.exit(1);
  }, 10000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

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