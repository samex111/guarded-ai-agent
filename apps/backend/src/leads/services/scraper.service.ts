/**
 * Scraper Service — calls the external scraper microservice.
 *
 * Flow: POST {SCRAPER_SERVICE_URL}/api/public/scrape  →  { urls: [url] }
 * Returns normalized ScrapedLead ready for DB insertion.
 */

import { getConfig } from "../../config/index.js";

// ─── Types ───────────────────────────────────────────────

export interface ScrapedLead {
  website: string;
  name: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  businessType: string | null;
  industry: string | null;
  logo: string | null;
  keywords: string | null;
  pages: Record<string, unknown> | null;
  socials: Record<string, unknown> | null;
  technologies: unknown[] | null;
  seo: Record<string, unknown> | null;
  performance: Record<string, unknown> | null;
  confidence: number;
  leadScore: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  rawData: Record<string, unknown>;
}

/** Shape returned by the scraper microservice for each URL */
interface ScraperMicroserviceItem {
  url: string;
  success: boolean;
  data: {
    website?: string;
    logo?: string;
    name?: string;
    description?: string;
    businessType?: string;
    keywords?: string;
    email?: string;
    phone?: string;
    pages?: Record<string, unknown>;
    socials?: Record<string, unknown>;
    technologies?: unknown[];
    seo?: Record<string, unknown>;
    performance?: Record<string, unknown>;
    confidence?: number;
    leadScore?: number;
    priority?: string;
    [key: string]: unknown;
  };
}

interface ScraperMicroserviceResponse {
  success: boolean;
  data: ScraperMicroserviceItem[];
}

// ─── Service ─────────────────────────────────────────────

const SCRAPE_TIMEOUT_MS = 30_000;

/**
 * Call the external scraper microservice and return normalized lead data.
 * Throws on network / validation errors.
 */
export async function scrapeWebsite(url: string): Promise<ScrapedLead> {
  const config = getConfig();
  const scraperUrl = `${config.SCRAPER_SERVICE_URL.replace(/\/$/, "")}/api/public/scrape`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(scraperUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [url] }),
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error(
      `Scraper microservice unreachable at ${scraperUrl}: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Scraper microservice returned ${response.status}: ${text.slice(0, 300)}`,
    );
  }

  const json = (await response.json()) as ScraperMicroserviceResponse;

  if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
    throw new Error("Scraper microservice returned empty or unsuccessful response");
  }

  const item = json.data[0];
  if (!item || !item.success || !item.data) {
    throw new Error(
      `Scraper failed for URL ${url}: ${JSON.stringify(item).slice(0, 300)}`,
    );
  }

  return normalizeScrapeResult(url, item.data);
}

// ─── Normalizer ──────────────────────────────────────────

function normalizeScrapeResult(
  originalUrl: string,
  raw: ScraperMicroserviceItem["data"],
): ScrapedLead {
  const leadScore = clampScore(raw.leadScore);
  const confidence = clampScore(raw.confidence);
  const priority = normalizePriority(raw.priority, leadScore);

  return {
    website: raw.website || originalUrl,
    name: raw.name || null,
    description: raw.description || null,
    email: raw.email || null,
    phone: raw.phone || null,
    businessType: raw.businessType || null,
    industry: null, // microservice doesn't return industry directly
    logo: raw.logo || null,
    keywords: raw.keywords || null,
    pages: raw.pages && Object.keys(raw.pages).length > 0 ? raw.pages : null,
    socials: raw.socials && Object.keys(raw.socials).length > 0 ? raw.socials : null,
    technologies: Array.isArray(raw.technologies) && raw.technologies.length > 0 ? raw.technologies : null,
    seo: raw.seo && Object.keys(raw.seo).length > 0 ? raw.seo : null,
    performance: raw.performance && Object.keys(raw.performance).length > 0 ? raw.performance : null,
    confidence,
    leadScore,
    priority,
    rawData: raw as Record<string, unknown>,
  };
}

function clampScore(v: unknown): number {
  const n = typeof v === "number" ? v : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizePriority(
  raw: unknown,
  score: number,
): "HIGH" | "MEDIUM" | "LOW" {
  if (typeof raw === "string") {
    const upper = raw.toUpperCase();
    if (upper === "HIGH" || upper === "MEDIUM" || upper === "LOW") {
      return upper as "HIGH" | "MEDIUM" | "LOW";
    }
  }
  // Derive from score
  if (score >= 80) return "HIGH";
  if (score >= 55) return "MEDIUM";
  return "LOW";
}
