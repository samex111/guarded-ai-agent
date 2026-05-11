/**
 * Policy Matcher — matches tool requests against policy rule patterns.
 *
 * Supports:
 *   - Exact match: "read_file"
 *   - Wildcard: "*" (matches everything)
 *   - Prefix glob: "read_*", "fs_*"
 *   - Suffix glob: "*_file"
 *
 * This module is pure — no side effects, no DB access.
 */

export interface MatchTarget {
  toolName: string;
  serverName: string;
}

export interface RulePattern {
  toolPattern: string;
  serverPattern: string | null;
}

/**
 * Check if a tool request matches a policy rule's patterns.
 * Both tool pattern AND server pattern must match (if server pattern is set).
 */
export function matchesRule(target: MatchTarget, rule: RulePattern): boolean {
  // Tool pattern must always match
  if (!globMatch(target.toolName, rule.toolPattern)) {
    return false;
  }

  // Server pattern is optional — if set, it must match
  if (rule.serverPattern !== null && rule.serverPattern !== "") {
    if (!globMatch(target.serverName, rule.serverPattern)) {
      return false;
    }
  }

  return true;
}

/**
 * Simple glob matching.
 *   "*"       → matches anything
 *   "foo_*"   → matches anything starting with "foo_"
 *   "*_bar"   → matches anything ending with "_bar"
 *   "foo*bar" → matches anything starting with "foo" and ending with "bar"
 *   "exact"   → exact match only
 */
function globMatch(value: string, pattern: string): boolean {
  // Universal wildcard
  if (pattern === "*") return true;

  // Exact match (no wildcards)
  if (!pattern.includes("*")) {
    return value === pattern;
  }

  // Convert glob to regex
  const escaped = pattern
    .split("*")
    .map(escapeRegex)
    .join(".*");

  const regex = new RegExp(`^${escaped}$`);
  return regex.test(value);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
