/**
 * Policy Engine — the core guardrail enforcement layer.
 *
 * This is the ONLY path from agent to MCP tool execution.
 * The LLM is untrusted. This module is deterministic.
 *
 * Decision flow:
 *   1. Load active rules from cache
 *   2. Match rules against the tool request
 *   3. Apply priority ordering: DENY > REQUIRE_APPROVAL > ALLOW
 *   4. Run input validators for VALIDATION-type rules
 *   5. Return decision + audit log the result
 *
 * This module is self-contained — no agent logic, no MCP transport.
 */

import { matchesRule } from "./matcher.js";
import { validateArgs } from "./validators.js";
import { getPolicyCache, type CachedRule } from "./cache.js";
import { logAudit } from "./audit.js";

// ─── Types ───────────────────────────────────────────────

export interface ToolRequest {
  toolName: string;
  serverName: string;
  arguments: Record<string, unknown>;
  conversationId: string;
  toolCallId?: string;
}

export interface PolicyDecision {
  /** The final verdict */
  action: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
  /** The rule that produced this decision (null = default allow) */
  matchedRule: { id: string; name: string } | null;
  /** Human-readable reason */
  reason: string;
  /** Validation errors (only for DENY from validation rules) */
  validationErrors: string[];
}

// ─── Action Priority ─────────────────────────────────────

const ACTION_PRIORITY: Record<string, number> = {
  DENY: 3,
  REQUIRE_APPROVAL: 2,
  ALLOW: 1,
};

// ─── Core Evaluation ─────────────────────────────────────

/**
 * Evaluate a tool request against all active policy rules.
 *
 * Returns a deterministic decision: ALLOW, DENY, or REQUIRE_APPROVAL.
 * The LLM cannot influence this decision — it's pure policy evaluation.
 */
export async function evaluate(request: ToolRequest): Promise<PolicyDecision> {
  const cache = getPolicyCache();
  const rules = await cache.getRules();

  // 1. Find all matching rules
  const matchingRules = rules.filter((rule) =>
    matchesRule(
      { toolName: request.toolName, serverName: request.serverName },
      { toolPattern: rule.toolPattern, serverPattern: rule.serverPattern },
    ),
  );

  // 2. No matching rules → default ALLOW
  if (matchingRules.length === 0) {
    const decision: PolicyDecision = {
      action: "ALLOW",
      matchedRule: null,
      reason: "No matching policy rules — default allow",
      validationErrors: [],
    };

    emitAudit(request, decision, "TOOL_ALLOWED");
    return decision;
  }

  // 3. Sort by priority: DENY > REQUIRE_APPROVAL > ALLOW
  //    Within same action type, higher priority number wins
  const sorted = [...matchingRules].sort((a, b) => {
    const actionDiff =
      (ACTION_PRIORITY[b.action] ?? 0) - (ACTION_PRIORITY[a.action] ?? 0);
    if (actionDiff !== 0) return actionDiff;
    return b.priority - a.priority;
  });

  // 4. Process rules in priority order
  for (const rule of sorted) {
    // DENY rules — immediate block
    if (rule.action === "DENY") {
      const decision: PolicyDecision = {
        action: "DENY",
        matchedRule: { id: rule.id, name: rule.name },
        reason: `Blocked by rule: "${rule.name}"`,
        validationErrors: [],
      };

      emitAudit(request, decision, "TOOL_BLOCKED");
      return decision;
    }

    // VALIDATION rules — run validators, deny if any fail
    if (rule.ruleType === "VALIDATION") {
      const result = validateArgs(request.arguments, rule.conditions);

      if (!result.valid) {
        const decision: PolicyDecision = {
          action: "DENY",
          matchedRule: { id: rule.id, name: rule.name },
          reason: `Validation failed: "${rule.name}"`,
          validationErrors: result.errors,
        };

        emitAudit(request, decision, "TOOL_BLOCKED");
        return decision;
      }
    }

    // REQUIRE_APPROVAL rules — pause for human approval
    if (rule.action === "REQUIRE_APPROVAL") {
      const decision: PolicyDecision = {
        action: "REQUIRE_APPROVAL",
        matchedRule: { id: rule.id, name: rule.name },
        reason: `Requires approval: "${rule.name}"`,
        validationErrors: [],
      };

      emitAudit(request, decision, "TOOL_APPROVAL_REQUIRED");
      return decision;
    }
  }

  // 5. All matching rules passed — ALLOW
  const bestMatch = sorted[sorted.length - 1]!;
  const decision: PolicyDecision = {
    action: "ALLOW",
    matchedRule: { id: bestMatch.id, name: bestMatch.name },
    reason: `Allowed by rule: "${bestMatch.name}"`,
    validationErrors: [],
  };

  emitAudit(request, decision, "TOOL_ALLOWED");
  return decision;
}

// ─── Audit Helper ────────────────────────────────────────

function emitAudit(
  request: ToolRequest,
  decision: PolicyDecision,
  eventType: "TOOL_ALLOWED" | "TOOL_BLOCKED" | "TOOL_APPROVAL_REQUIRED",
): void {
  logAudit({
    eventType,
    conversationId: request.conversationId,
    toolCallId: request.toolCallId,
    policyRuleId: decision.matchedRule?.id,
    toolName: request.toolName,
    details: {
      serverName: request.serverName,
      action: decision.action,
      reason: decision.reason,
      validationErrors: decision.validationErrors,
      arguments: request.arguments,
    },
  });
}

// ─── Initialization ──────────────────────────────────────

/**
 * Initialize the policy engine.
 * Call once at server startup to set up cache + pub/sub.
 */
export async function initializePolicyEngine(): Promise<void> {
  const cache = getPolicyCache();
  await cache.subscribe();
  await cache.getRules(); // Pre-load cache
  console.log("🛡️  Policy engine initialized");
}
