/**
 * Prisma client singleton.
 *
 * Uses @prisma/adapter-pg for direct TCP connections to PostgreSQL.
 * This avoids the prisma+postgres proxy protocol issues with Prisma v7.
 */

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { getConfig } from "../config/index.js";

let _client: PrismaClient | undefined;
let _pool: pg.Pool | undefined;

export function getPrismaClient(): PrismaClient {
  if (_client === undefined) {
    const config = getConfig();

    _pool = new pg.Pool({
      connectionString: config.DATABASE_URL,
    });

    const adapter = new PrismaPg(_pool);

    _client = new PrismaClient({
      adapter,
      log:
        config.NODE_ENV === "development"
          ? ["error", "warn"]
          : ["error"],
    });
  }

  return _client;
}

export async function disconnectPrisma(): Promise<void> {
  if (_client !== undefined) {
    await _client.$disconnect();
    _client = undefined;
  }

  if (_pool !== undefined) {
    await _pool.end();
    _pool = undefined;
  }
}
