/**
 * Lead persistence and scrape orchestration.
 * Full artifacts live in PostgreSQL; callers return compact summaries to the LLM.
 */

import { getPrismaClient } from "../db/client.js";
import type { LeadPriority, LeadStatus } from "../generated/prisma/client.js";
import {
  emitLeadCreated,
  emitLeadDeleted,
  emitLeadSaved,
  emitLeadUpdated,
} from "../websocket/events.js";
import { deriveScores, extractTitle } from "./scrape-helpers.js";

const SCRAPE_BODY_MAX = 512_000;
const TEMP_TTL_MS = 24 * 60 * 60 * 1000;

export async function scrapeAndCreateLead(url: string): Promise<{
  leadId: string;
  name: string;
  leadScore: number;
  priority: LeadPriority;
  confidence: number;
  expiresIn: string;
}> {
  const prisma = getPrismaClient();
  let website = url.trim();
  if (!/^https?:\/\//i.test(website)) {
    website = `https://${website}`;
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20_000);

  let html = "";
  let statusCode = 0;
  try {
    const res = await fetch(website, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "GuardedLeadBot/1.0 (+https://localhost)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });
    statusCode = res.status;
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > SCRAPE_BODY_MAX ? buf.slice(0, SCRAPE_BODY_MAX) : buf;
    html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
  } finally {
    clearTimeout(t);
  }

  const name = extractTitle(html) || new URL(website).hostname;
  const { leadScore, confidence, priority } = deriveScores(
    website,
    name.length,
    html.length,
  );

  const now = new Date();
  const expiresAt = new Date(now.getTime() + TEMP_TTL_MS);

  const data = {
    scrape: {
      fetchedAt: now.toISOString(),
      statusCode,
      contentLength: html.length,
      snippet: html.slice(0, 2000),
    },
  };

  const lead = await prisma.lead.create({
    data: {
      website,
      name,
      leadScore,
      confidence,
      priority,
      status: "TEMPORARY",
      data: data as object,
      expiresAt,
    },
  });

  emitLeadCreated({
    leadId: lead.id,
    website: lead.website,
    status: lead.status,
    expiresAt: lead.expiresAt?.toISOString() ?? null,
  });

  return {
    leadId: lead.id,
    name: lead.name,
    leadScore: lead.leadScore,
    priority: lead.priority,
    confidence: lead.confidence,
    expiresIn: "24h",
  };
}

export interface ListLeadsParams {
  page?: number;
  pageSize?: number;
  status?: LeadStatus;
  sort?: "createdAt" | "leadScore" | "updatedAt";
  order?: "asc" | "desc";
}

export async function listLeads(params: ListLeadsParams) {
  const prisma = getPrismaClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const skip = (page - 1) * pageSize;
  const sortField = params.sort ?? "createdAt";
  const order = params.order ?? "desc";

  const where = {
    deletedAt: null as Date | null,
    ...(params.status ? { status: params.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { [sortField]: order },
      skip,
      take: pageSize,
      select: {
        id: true,
        website: true,
        name: true,
        leadScore: true,
        confidence: true,
        priority: true,
        status: true,
        expiresAt: true,
        pinned: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getLeadById(id: string, includeDeleted = false) {
  const prisma = getPrismaClient();
  return prisma.lead.findFirst({
    where: {
      id,
      ...(includeDeleted ? {} : { deletedAt: null }),
    },
  });
}

export async function saveLead(id: string) {
  const prisma = getPrismaClient();
  const lead = await prisma.lead.updateMany({
    where: { id, deletedAt: null },
    data: {
      status: "SAVED",
      expiresAt: null,
    },
  });
  if (lead.count === 0) {
    throw new Error("Lead not found or deleted");
  }
  const updated = await prisma.lead.findUniqueOrThrow({ where: { id } });
  emitLeadSaved({
    leadId: updated.id,
    status: updated.status,
  });
  return updated;
}

export async function updateLead(
  id: string,
  patch: { notes?: string; tags?: string[]; pinned?: boolean },
) {
  const prisma = getPrismaClient();
  const existing = await prisma.lead.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    throw new Error("Lead not found or deleted");
  }

  const data: Record<string, unknown> = {};
  if (patch.notes !== undefined) data.notes = patch.notes;
  if (patch.tags !== undefined) data.tags = patch.tags;
  if (patch.pinned !== undefined) data.pinned = patch.pinned;

  if (Object.keys(data).length === 0) {
    emitLeadUpdated({ leadId: existing.id });
    return existing;
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: data as object,
  });
  emitLeadUpdated({ leadId: updated.id });
  return updated;
}

export async function recordExport(id: string) {
  const prisma = getPrismaClient();
  return prisma.lead.update({
    where: { id },
    data: { exportCount: { increment: 1 } },
  });
}

export async function softDeleteLead(id: string) {
  const prisma = getPrismaClient();
  const now = new Date();
  const lead = await prisma.lead.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: now },
  });
  if (lead.count === 0) {
    throw new Error("Lead not found or already deleted");
  }
  emitLeadDeleted({ leadId: id });
  return { ok: true as const };
}

export async function softDeleteAllLeads(confirmationPhrase: string) {
  if (confirmationPhrase !== "DELETE_ALL_LEADS_CONFIRMED") {
    throw new Error(
      'Invalid confirmation phrase. Send exactly: DELETE_ALL_LEADS_CONFIRMED',
    );
  }
  const prisma = getPrismaClient();
  const now = new Date();
  const result = await prisma.lead.updateMany({
    where: { deletedAt: null },
    data: { deletedAt: now },
  });
  return { deletedCount: result.count };
}

/** Remove expired temporary leads (hard delete). */
export async function purgeExpiredTemporaryLeads(): Promise<number> {
  const prisma = getPrismaClient();
  const now = new Date();
  const r = await prisma.lead.deleteMany({
    where: {
      status: "TEMPORARY",
      expiresAt: { lt: now },
    },
  });
  return r.count;
}
