/**
 * Policy Cache — in-memory cache of active policy rules.
 *
 * Rules are loaded from the database and cached in memory for fast access.
 * Cache is invalidated via Redis pub/sub when rules change in the dashboard.
 *
 * Why in-memory and not Redis?
 *   - Rules are small (typically < 100)
 *   - Every tool call hits the policy engine — must be sub-millisecond
 *   - Redis pub/sub handles invalidation across instances
 */

import { getPrismaClient } from "../db/client.js";
import { getRedisSubscriber, getRedis } from "../db/redis.js";

const POLICY_CHANNEL = "policy:updated";

export interface CachedRule {
  id: string;
  name: string;
  description: string;
  ruleType: string;
  action: string;
  toolPattern: string;
  serverPattern: string | null;
  conditions: Record<string, unknown>;
  priority: number;
  enabled: boolean;
}

class PolicyCacheStore {
  private rules: CachedRule[] | null = null;
  private subscribed = false;

  /** Get all active rules (from cache or DB). */
  async getRules(): Promise<CachedRule[]> {
    if (this.rules === null) {
      await this.load();
    }
    return this.rules!;
  }

  /** Force reload rules from database. */
  async load(): Promise<void> {
    const prisma = getPrismaClient();

    const dbRules = await prisma.policyRule.findMany({
      where: { enabled: true },
      orderBy: { priority: "desc" },
    });

    this.rules = dbRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      ruleType: rule.ruleType,
      action: rule.action,
      toolPattern: rule.toolPattern,
      serverPattern: rule.serverPattern,
      conditions:
        typeof rule.conditions === "object" && rule.conditions !== null
          ? (rule.conditions as Record<string, unknown>)
          : {},
      priority: rule.priority,
      enabled: rule.enabled,
    }));

    console.log(`📋 Policy cache loaded: ${this.rules.length} active rule(s)`);
  }

  /** Invalidate the cache — next access will reload from DB. */
  invalidate(): void {
    this.rules = null;
  }

  /**
   * Subscribe to Redis pub/sub for cache invalidation.
   * Call this once at startup.
   */
  async subscribe(): Promise<void> {
    if (this.subscribed) return;

    const subscriber = getRedisSubscriber();

    await subscriber.subscribe(POLICY_CHANNEL);

    subscriber.on("message", (channel: string) => {
      if (channel === POLICY_CHANNEL) {
        console.log("🔄 Policy cache invalidated via pub/sub");
        this.invalidate();
      }
    });

    this.subscribed = true;
    console.log(`📡 Policy cache subscribed to "${POLICY_CHANNEL}"`);
  }

  /**
   * Publish a cache invalidation event.
   * Call this when rules are created/updated/deleted via the API.
   */
  static async publishInvalidation(): Promise<void> {
    const redis = getRedis();
    await redis.publish(POLICY_CHANNEL, "invalidate");
  }
}

// ─── Singleton ───────────────────────────────────────────

let _cache: PolicyCacheStore | undefined;

export function getPolicyCache(): PolicyCacheStore {
  if (_cache === undefined) {
    _cache = new PolicyCacheStore();
  }
  return _cache;
}

export { PolicyCacheStore };
