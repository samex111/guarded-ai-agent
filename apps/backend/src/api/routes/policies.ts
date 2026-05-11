/**
 * Policy Rules API routes.
 *
 * GET    /api/policies          — List all rules
 * POST   /api/policies          — Create a rule
 * PUT    /api/policies/:id      — Update a rule
 * DELETE /api/policies/:id      — Delete a rule
 * PATCH  /api/policies/:id/toggle — Toggle enabled/disabled
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getPrismaClient } from "../../db/client.js";
import { PolicyCacheStore } from "../../policy/cache.js";
import { logAudit } from "../../policy/audit.js";
import { getSocketIO } from "../../websocket/events.js";

export const policyRouter = Router();

// ─── Schemas ─────────────────────────────────────────────

const createPolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  ruleType: z.enum(["BLOCK", "APPROVAL", "VALIDATION"]),
  action: z.enum(["DENY", "REQUIRE_APPROVAL", "ALLOW"]),
  toolPattern: z.string().min(1),
  serverPattern: z.string().optional(),
  conditions: z.record(z.unknown()).optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

const updatePolicySchema = createPolicySchema.partial();

// ─── GET / — List all ────────────────────────────────────

policyRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrismaClient();
    const rules = await prisma.policyRule.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    return res.json({ success: true, data: rules });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Server error",
    });
  }
});

// ─── POST / — Create ────────────────────────────────────

policyRouter.post("/", async (req: Request, res: Response) => {
  try {
    const body = createPolicySchema.parse(req.body);
    const prisma = getPrismaClient();

    const rule = await prisma.policyRule.create({
      data: {
        name: body.name,
        description: body.description ?? "",
        ruleType: body.ruleType,
        action: body.action,
        toolPattern: body.toolPattern,
        serverPattern: body.serverPattern ?? null,
        conditions: (body.conditions as object) ?? {},
        priority: body.priority ?? 0,
        enabled: body.enabled ?? true,
      },
    });

    // Invalidate cache + notify clients
    await PolicyCacheStore.publishInvalidation();
    getSocketIO().emit("policy:updated", { action: "created", ruleId: rule.id });

    logAudit({
      eventType: "POLICY_CREATED",
      policyRuleId: rule.id,
      details: { name: rule.name, action: rule.action, toolPattern: rule.toolPattern },
    });

    return res.status(201).json({ success: true, data: rule });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Invalid request",
    });
  }
});

// ─── PUT /:id — Update ──────────────────────────────────

policyRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const body = updatePolicySchema.parse(req.body);
    const prisma = getPrismaClient();

    const rule = await prisma.policyRule.update({
      where: { id: req.params.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.ruleType !== undefined ? { ruleType: body.ruleType } : {}),
        ...(body.action !== undefined ? { action: body.action } : {}),
        ...(body.toolPattern !== undefined ? { toolPattern: body.toolPattern } : {}),
        ...(body.serverPattern !== undefined ? { serverPattern: body.serverPattern ?? null } : {}),
        ...(body.conditions !== undefined ? { conditions: body.conditions as object } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
      },
    });

    await PolicyCacheStore.publishInvalidation();
    getSocketIO().emit("policy:updated", { action: "updated", ruleId: rule.id });

    logAudit({
      eventType: "POLICY_UPDATED",
      policyRuleId: rule.id,
      details: { name: rule.name },
    });

    return res.json({ success: true, data: rule });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Invalid request",
    });
  }
});

// ─── DELETE /:id — Delete ────────────────────────────────

policyRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaClient();

    const rule = await prisma.policyRule.delete({
      where: { id: req.params.id },
    });

    await PolicyCacheStore.publishInvalidation();
    getSocketIO().emit("policy:updated", { action: "deleted", ruleId: rule.id });

    logAudit({
      eventType: "POLICY_DELETED",
      policyRuleId: rule.id,
      details: { name: rule.name },
    });

    return res.json({ success: true, data: { id: rule.id } });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Invalid request",
    });
  }
});

// ─── PATCH /:id/toggle — Toggle enabled ─────────────────

policyRouter.patch("/:id/toggle", async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaClient();

    const existing = await prisma.policyRule.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Rule not found" });
    }

    const rule = await prisma.policyRule.update({
      where: { id: req.params.id },
      data: { enabled: !existing.enabled },
    });

    await PolicyCacheStore.publishInvalidation();
    getSocketIO().emit("policy:updated", { action: "toggled", ruleId: rule.id, enabled: rule.enabled });

    logAudit({
      eventType: "POLICY_TOGGLED",
      policyRuleId: rule.id,
      details: { name: rule.name, enabled: rule.enabled },
    });

    return res.json({ success: true, data: rule });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Invalid request",
    });
  }
});
