/**
 * Smoke tests for lead scrape helpers (no DB, no network).
 * Run: npm run test:leads
 */

import assert from "node:assert/strict";

import { deriveScores, extractTitle } from "./scrape-helpers.js";

assert.equal(extractTitle("<title>  Hello  World  </title>"), "Hello World");
assert.equal(extractTitle("<html></html>"), "");
assert.equal(extractTitle("<TITLE>Acme</TITLE>"), "Acme");

const s = deriveScores("https://example.com", 10, 100_000);
assert.equal(typeof s.leadScore, "number");
assert.ok(s.leadScore >= 0 && s.leadScore <= 99);
assert.ok(["LOW", "MEDIUM", "HIGH"].includes(s.priority));

console.log("✅ scrape-helpers smoke tests passed");
