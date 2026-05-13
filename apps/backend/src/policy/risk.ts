/**
 * Risk tiers for lead MCP tools (governance reference).
 * Policy decisions remain in policy rules + engine; this is metadata only.
 */

export type LeadToolRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const RISK: Record<string, LeadToolRisk> = {
  analyze_website: "LOW",
  show_leads: "LOW",
  get_lead: "LOW",
  save_lead: "LOW",
  update_lead: "MEDIUM",
  download_lead: "MEDIUM",
  delete_lead: "HIGH",
  delete_all_leads: "CRITICAL",
};

export function leadToolRisk(toolName: string): LeadToolRisk {
  return RISK[toolName] ?? "MEDIUM";
}
