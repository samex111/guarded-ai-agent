/**
 * Smoke test for lead-mcp URL normalization (no network).
 * Run: npm run test:smoke
 */

import assert from "node:assert/strict";

import { normalizeServiceBaseUrl } from "./http.js";

assert.equal(
  normalizeServiceBaseUrl(undefined, "http://localhost:8080/"),
  "http://localhost:8080",
);
assert.equal(
  normalizeServiceBaseUrl("http://api:9000/", "x"),
  "http://api:9000",
);

console.log("✅ lead-mcp http smoke tests passed");
