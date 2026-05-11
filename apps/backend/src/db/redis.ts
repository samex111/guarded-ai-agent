/**
 * Redis connection management.
 *
 * Three connection types:
 *   1. Default — general commands, policy cache
 *   2. Subscriber — Redis pub/sub (dedicated, cannot run other commands)
 *   3. BullMQ factory — each worker/queue needs its own connection
 */

import {Redis} from "ioredis";
import { getConfig } from "../config/index.js";

// ─── Tracked connections for cleanup ─────────────────────

const connections: Redis[] = [];

function createConnection(name: string): Redis {
  const config = getConfig();

  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: true,
    lazyConnect: false,
    connectionName: name,
  });

  redis.on("connect", () => {
    console.log(`✅ Redis [${name}] connected`);
  });

  redis.on("error", (err: Error) => {
    console.error(`❌ Redis [${name}] error:`, err.message);
  });

  connections.push(redis);
  return redis;
}

// ─── Singletons ──────────────────────────────────────────

let _default: Redis | undefined;
let _subscriber: Redis | undefined;

export function getRedis(): Redis {
  if (_default === undefined) {
    _default = createConnection("default");
  }
  return _default;
}

export function getRedisSubscriber(): Redis {
  if (_subscriber === undefined) {
    _subscriber = createConnection("subscriber");
  }
  return _subscriber;
}

/** Factory for BullMQ — each queue/worker needs its own connection. */
export function createBullMQConnection(name: string): Redis {
  return createConnection(`bullmq:${name}`);
}

// ─── Shutdown ────────────────────────────────────────────

export async function disconnectAllRedis(): Promise<void> {
  const pending = connections.map(async (conn) => {
    try {
      await conn.quit();
    } catch {
      conn.disconnect();
    }
  });

  await Promise.allSettled(pending);
  connections.length = 0;
  _default = undefined;
  _subscriber = undefined;
}
