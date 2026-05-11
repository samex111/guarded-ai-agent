/**
 * Policy Validators — input validation rules for tool arguments.
 *
 * Validators are defined in the policy rule's `conditions` JSON field.
 * Each condition type maps to a validator function.
 *
 * Example conditions:
 * {
 *   "pathMustBeUnder": "/safe",
 *   "maxContentLength": 10000,
 *   "blockedArgPatterns": ["*.exe", "*.sh"],
 *   "requiredArgs": ["path"]
 * }
 *
 * This module is pure — no side effects, no DB access.
 */

import path from "node:path";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

type ValidatorFn = (
  args: Record<string, unknown>,
  conditionValue: unknown,
) => string | null; // null = passed, string = error message

// ─── Validator Registry ──────────────────────────────────

const validators = new Map<string, ValidatorFn>();

/** Register a validator for a condition type. */
function registerValidator(conditionType: string, fn: ValidatorFn): void {
  validators.set(conditionType, fn);
}

// ─── Built-in Validators ─────────────────────────────────

// Ensure file paths stay under a specific directory
registerValidator("pathMustBeUnder", (args, conditionValue) => {
  if (typeof conditionValue !== "string") return null;

  const filePath = args["path"];
  if (typeof filePath !== "string") return null;

  const resolved = path.resolve(conditionValue, filePath);
  const normalizedBase = path.resolve(conditionValue);

  if (!resolved.startsWith(normalizedBase)) {
    return `Path "${filePath}" must be under "${conditionValue}"`;
  }

  return null;
});

// Enforce maximum content length for write operations
registerValidator("maxContentLength", (args, conditionValue) => {
  if (typeof conditionValue !== "number") return null;

  const content = args["content"];
  if (typeof content !== "string") return null;

  if (content.length > conditionValue) {
    return `Content length ${content.length} exceeds maximum ${conditionValue}`;
  }

  return null;
});

// Block arguments matching specific patterns
registerValidator("blockedArgPatterns", (args, conditionValue) => {
  if (!Array.isArray(conditionValue)) return null;

  for (const [key, value] of Object.entries(args)) {
    if (typeof value !== "string") continue;

    for (const pattern of conditionValue) {
      if (typeof pattern !== "string") continue;

      const regex = new RegExp(
        `^${pattern.split("*").map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`,
      );

      if (regex.test(value)) {
        return `Argument "${key}" matches blocked pattern "${pattern}"`;
      }
    }
  }

  return null;
});

// Require certain arguments to be present
registerValidator("requiredArgs", (args, conditionValue) => {
  if (!Array.isArray(conditionValue)) return null;

  for (const required of conditionValue) {
    if (typeof required !== "string") continue;

    if (!(required in args) || args[required] === undefined || args[required] === "") {
      return `Required argument "${required}" is missing or empty`;
    }
  }

  return null;
});

// Block specific argument values
registerValidator("blockedValues", (args, conditionValue) => {
  if (typeof conditionValue !== "object" || conditionValue === null) return null;

  const blocked = conditionValue as Record<string, unknown[]>;

  for (const [argName, blockedVals] of Object.entries(blocked)) {
    if (!Array.isArray(blockedVals)) continue;

    const argValue = args[argName];
    if (blockedVals.includes(argValue)) {
      return `Argument "${argName}" has a blocked value`;
    }
  }

  return null;
});

// ─── Main Validation Function ────────────────────────────

/**
 * Validate tool arguments against a set of conditions.
 * Returns all validation errors (not just the first one).
 */
export function validateArgs(
  args: Record<string, unknown>,
  conditions: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = [];

  for (const [conditionType, conditionValue] of Object.entries(conditions)) {
    const validator = validators.get(conditionType);

    if (!validator) {
      // Unknown condition type — skip (don't block on unknown validators)
      continue;
    }

    const error = validator(args, conditionValue);
    if (error !== null) {
      errors.push(error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
