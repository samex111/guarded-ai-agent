/**
 * Registers all lead MCP tools (thin HTTP wrappers around the backend).
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLeadApiBase, getLeadIntelligenceBase, readJson } from "../http.js";

export function registerLeadTools(server: McpServer): void {
  server.tool(
    "analyze_website",
    "Scrape a URL, create a temporary lead (24h TTL), return a compact summary only.",
    { url: z.string().describe("Website URL to analyze") },
    async ({ url }) => {
      try {
        const base = getLeadIntelligenceBase();
        const json = await readJson<{
          success: boolean;
          data?: {
            leadId: string;
            name: string;
            leadScore: number;
            priority: string;
            confidence: number;
            expiresIn: string;
          };
          message?: unknown;
        }>(`${base}/api/public/scrape`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!json.success || json.data === undefined) {
          return {
            content: [{ type: "text" as const, text: `Error: ${String(json.message ?? "scrape failed")}` }],
            isError: true,
          };
        }
        const row = json.data;

        const compactLead = {
          leadId: row.leadId,
          website: url,
          name: row.name,
          leadScore: row.leadScore,
          confidence: row.confidence,
          priority: row.priority,
          expiresIn: row.expiresIn,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(compactLead, null, 2),
            },
          ],
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `Error: ${msg}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "show_leads",
    "List leads with pagination (summaries only).",
    {
      page: z.number().int().min(1).optional().describe("Page number (default 1)"),
      pageSize: z.number().int().min(1).max(100).optional().describe("Page size (default 20)"),
      status: z.enum(["TEMPORARY", "SAVED"]).optional(),
      sort: z.enum(["createdAt", "leadScore", "updatedAt"]).optional(),
      order: z.enum(["asc", "desc"]).optional(),
    },
    async (args) => {
      try {
        const base = getLeadApiBase();
        const q = new URLSearchParams();
        if (args.page !== undefined) q.set("page", String(args.page));
        if (args.pageSize !== undefined) q.set("pageSize", String(args.pageSize));
        if (args.status !== undefined) q.set("status", args.status);
        if (args.sort !== undefined) q.set("sort", args.sort);
        if (args.order !== undefined) q.set("order", args.order);
        const qs = q.toString();
        const json = await readJson<{ success: boolean; data?: unknown }>(
          `${base}/api/leads${qs ? `?${qs}` : ""}`,
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(json.data, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : "list failed"}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_lead",
    "Return the full lead record (JSON).",
    { leadId: z.string().describe("Lead id") },
    async ({ leadId }) => {
      try {
        const base = getLeadApiBase();
        const json = await readJson<{ success: boolean; data?: unknown }>(
          `${base}/api/leads/${encodeURIComponent(leadId)}`,
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(json.data, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : "get failed"}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "save_lead",
    "Mark a temporary lead as saved permanently (clears TTL).",
    { leadId: z.string() },
    async ({ leadId }) => {
      try {
        const base = getLeadApiBase();
        const json = await readJson<{ success: boolean; data?: unknown }>(
          `${base}/api/leads/${encodeURIComponent(leadId)}/save`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(json.data, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : "save failed"}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "update_lead",
    "Update notes, tags, or pinned flag.",
    {
      leadId: z.string(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
      pinned: z.boolean().optional(),
    },
    async ({ leadId, notes, tags, pinned }) => {
      try {
        const base = getLeadApiBase();
        const body = JSON.stringify({ notes, tags, pinned });
        const json = await readJson<{ success: boolean; data?: unknown }>(
          `${base}/api/leads/${encodeURIComponent(leadId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body,
          },
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(json.data, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : "update failed"}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "download_lead",
    "Prepare an export payload (JSON). Policy may require approval when invoked via the agent.",
    { leadId: z.string() },
    async ({ leadId }) => {
      try {
        const base = getLeadApiBase();
        const json = await readJson<{ success: boolean; data?: { content?: string; filename?: string } }>(
          `${base}/api/leads/${encodeURIComponent(leadId)}/export`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
        );
        const d = json.data;
        const summary = {
          filename: d?.filename,
          exportReady: true,
          preview: d?.content?.slice(0, 500),
        };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { summary, fullExport: d?.content },
                null,
                2,
              ),
            },
          ],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : "export failed"}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "delete_lead",
    "Soft-delete a lead (sets deletedAt). Policy may require approval.",
    { leadId: z.string() },
    async ({ leadId }) => {
      try {
        const base = getLeadApiBase();
        const json = await readJson<{ success: boolean; data?: unknown }>(
          `${base}/api/leads/${encodeURIComponent(leadId)}`,
          { method: "DELETE" },
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(json.data, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : "delete failed"}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "delete_all_leads",
    "Soft-delete ALL leads. Requires exact confirmation phrase (see tool description).",
    {
      confirmationPhrase: z
        .string()
        .describe("Must be exactly: DELETE_ALL_LEADS_CONFIRMED"),
    },
    async ({ confirmationPhrase }) => {
      try {
        const base = getLeadApiBase();
        const json = await readJson<{ success: boolean; data?: unknown }>(
          `${base}/api/leads/delete-all`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirmationPhrase }),
          },
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(json.data, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : "delete-all failed"}` }],
          isError: true,
        };
      }
    },
  );
}
