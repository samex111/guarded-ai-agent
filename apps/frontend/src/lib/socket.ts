"use client";

import { io, type Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

let socket: Socket | undefined;

/**
 * Singleton Socket.io client (browser). Uses same origin as REST API by default.
 */
export function getSocket(): Socket {
  if (socket === undefined) {
    socket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      withCredentials: true,
    });
  } else if (!socket.connected) {
    socket.connect();
  }
  return socket;
}
