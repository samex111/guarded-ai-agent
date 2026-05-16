/**
 * Token + Cost Tracking Service.
 * Records per-request LLM usage and calculates estimated cost from pricing map.
 */

import { getPrismaClient } from "../../db/client.js";

// ─── Model Pricing Map (per 1M tokens) ──────────────────

interface ModelPricing {
  input: number;   // $/1M input tokens
  output: number;  // $/1M output tokens
}

const PRICING: Record<string, ModelPricing> = {
  // Groq
  "llama-3.3-70b-versatile":   { input: 0.59,  output: 0.79 },
  "llama-3.1-8b-instant":      { input: 0.05,  output: 0.08 },
  "mixtral-8x7b-32768":        { input: 0.24,  output: 0.24 },
  "gemma2-9b-it":              { input: 0.20,  output: 0.20 },
  // OpenAI
  "gpt-4o":                    { input: 2.50,  output: 10.00 },
  "gpt-4o-mini":               { input: 0.15,  output: 0.60 },
  "gpt-4-turbo":               { input: 10.00, output: 30.00 },
  "gpt-3.5-turbo":             { input: 0.50,  output: 1.50 },
  // Claude
  "claude-sonnet-4-20250514":  { input: 3.00,  output: 15.00 },
  "claude-3-5-sonnet-20241022": { input: 3.00,  output: 15.00 },
  "claude-3-haiku-20240307":   { input: 0.25,  output: 1.25 },
  "claude-3-opus-20240229":    { input: 15.00, output: 75.00 },
};

/** Fallback pricing for unknown models */
const DEFAULT_PRICING: ModelPricing = { input: 1.00, output: 3.00 };

function getPricing(model: string): ModelPricing {
  // Try exact match
  if (PRICING[model]) return PRICING[model];
  // Try prefix match
  const lower = model.toLowerCase();
  for (const [key, pricing] of Object.entries(PRICING)) {
    if (lower.startsWith(key) || lower.includes(key)) return pricing;
  }
  return DEFAULT_PRICING;
}

function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = getPricing(model);
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return {
    inputCost: Math.round(inputCost * 1_000_000) / 1_000_000,
    outputCost: Math.round(outputCost * 1_000_000) / 1_000_000,
    totalCost: Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000,
  };
}

// ─── Public API ──────────────────────────────────────────

export async function recordUsage(params: {
  conversationId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const prisma = getPrismaClient();
  const totalTokens = params.inputTokens + params.outputTokens;
  const costs = calculateCost(params.model, params.inputTokens, params.outputTokens);

  return prisma.conversationUsage.create({
    data: {
      conversationId: params.conversationId,
      provider: params.provider,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens,
      inputCost: costs.inputCost,
      outputCost: costs.outputCost,
      totalCost: costs.totalCost,
    },
  });
}

export async function getUsageSummary(conversationId: string) {
  const prisma = getPrismaClient();
  const rows = await prisma.conversationUsage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
  });

  const totals = rows.reduce(
    (acc, r) => ({
      inputTokens: acc.inputTokens + r.inputTokens,
      outputTokens: acc.outputTokens + r.outputTokens,
      totalTokens: acc.totalTokens + r.totalTokens,
      totalCost: acc.totalCost + r.totalCost,
      requestCount: acc.requestCount + 1,
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0, totalCost: 0, requestCount: 0 },
  );

  const lastModel = rows[0]?.model ?? null;
  const lastProvider = rows[0]?.provider ?? null;

  return {
    ...totals,
    totalCost: Math.round(totals.totalCost * 1_000_000) / 1_000_000,
    lastModel,
    lastProvider,
    history: rows.map((r) => ({
      id: r.id,
      model: r.model,
      provider: r.provider,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      totalTokens: r.totalTokens,
      totalCost: r.totalCost,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
