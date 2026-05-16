/**
 * Lead Intelligence HTTP API.
 * Mounted at /api — routes: /public/scrape, /leads, ...
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  getLeadById,
  listLeads,
  purgeExpiredTemporaryLeads,
  recordExport,
  saveLead,
  scrapeAndCreateLead,
  softDeleteAllLeads,
  softDeleteLead,
  updateLead,
} from "../../leads/service.js";

function readLeadId(req: Request, res: Response): string | undefined {
  const raw = req.params["id"];
  if (typeof raw !== "string" || raw.length === 0) {
    res.status(400).json({ success: false, message: "Missing lead id" });
    return undefined;
  }
  return raw;
}

const scrapeBodySchema = z.object({
  url: z.string().min(4),
});

async function handleScrape(req: Request, res: Response): Promise<void> {
  try {
    const parsed = scrapeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const summary = await scrapeAndCreateLead(parsed.data.url);
    res.status(201).json({ success: true, data: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    res.status(502).json({ success: false, message });
  }
}

/** Port 4001 — scrape-only surface per lead-mcp plan. */
export const intelligenceLeadRouter = Router();
intelligenceLeadRouter.post("/public/scrape", handleScrape);

export const leadRouter = Router();
leadRouter.post("/public/scrape", handleScrape);

leadRouter.get("/leads", async (req: Request, res: Response) => {
  try {
    const page = Number(req.query["page"]) || 1;
    const pageSize = Number(req.query["pageSize"]) || 20;
    const status = req.query["status"] as "TEMPORARY" | "SAVED" | undefined;
    const sort = (req.query["sort"] as "createdAt" | "leadScore" | "updatedAt") ?? "createdAt";
    const order = (req.query["order"] as "asc" | "desc") ?? "desc";
    const data = await listLeads({
      page,
      pageSize,
      sort,
      order,
      ...(status === "TEMPORARY" || status === "SAVED" ? { status } : {}),
    });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Server error",
    });
  }
});

leadRouter.get("/leads/:id", async (req: Request, res: Response) => {
  try {
    const id = readLeadId(req, res);
    if (id === undefined) return;
    const lead = await getLeadById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    return res.json({ success: true, data: lead });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Server error",
    });
  }
});

leadRouter.post("/leads/:id/save", async (req: Request, res: Response) => {
  try {
    const id = readLeadId(req, res);
    if (id === undefined) return;
    const lead = await saveLead(id);
    return res.json({ success: true, data: lead });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Save failed",
    });
  }
});

const updateBodySchema = z.object({
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  pinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
});

leadRouter.patch("/leads/:id", async (req: Request, res: Response) => {
  try {
    const parsed = updateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.flatten().fieldErrors,
      });
    }
    const id = readLeadId(req, res);
    if (id === undefined) return;
    const d = parsed.data;
    const patch = {
      ...(d.notes !== undefined ? { notes: d.notes } : {}),
      ...(d.tags !== undefined ? { tags: d.tags } : {}),
      ...(d.pinned !== undefined ? { pinned: d.pinned } : {}),
      ...(d.isFavorite !== undefined ? { isFavorite: d.isFavorite } : {}),
    };
    const lead = await updateLead(id, patch);
    return res.json({ success: true, data: lead });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Update failed",
    });
  }
});

leadRouter.post("/leads/:id/export", async (req: Request, res: Response) => {
  try {
    const id = readLeadId(req, res);
    if (id === undefined) return;
    const lead = await getLeadById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    await recordExport(id);
    const payload = {
      exportedAt: new Date().toISOString(),
      lead: {
        id: lead.id,
        website: lead.website,
        name: lead.name,
        leadScore: lead.leadScore,
        confidence: lead.confidence,
        priority: lead.priority,
        status: lead.status,
        notes: lead.notes,
        tags: lead.tags,
        rawData: lead.rawData,
      },
    };
    return res.json({
      success: true,
      data: {
        filename: `lead-${lead.id}.json`,
        mimeType: "application/json",
        content: JSON.stringify(payload, null, 2),
        exportCount: lead.exportCount + 1,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Export failed",
    });
  }
});

leadRouter.delete("/leads/:id", async (req: Request, res: Response) => {
  try {
    const id = readLeadId(req, res);
    if (id === undefined) return;
    await softDeleteLead(id);
    return res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Delete failed",
    });
  }
});

const deleteAllSchema = z.object({
  confirmationPhrase: z.string(),
});

leadRouter.post("/leads/delete-all", async (req: Request, res: Response) => {
  try {
    const parsed = deleteAllSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "confirmationPhrase required",
      });
    }
    const result = await softDeleteAllLeads(parsed.data.confirmationPhrase);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Operation failed",
    });
  }
});

/** Dev / worker hook — not exposed via MCP. */
leadRouter.post("/internal/purge-expired", async (_req: Request, res: Response) => {
  try {
    const n = await purgeExpiredTemporaryLeads();
    return res.json({ success: true, data: { purged: n } });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Purge failed",
    });
  }
});
