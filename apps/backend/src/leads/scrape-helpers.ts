import type { LeadPriority } from "../generated/prisma/client.js";

export function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1]?.trim().replace(/\s+/g, " ") ?? "";
}

export function deriveScores(
  website: string,
  titleLen: number,
  bodyLen: number,
): {
  leadScore: number;
  confidence: number;
  priority: LeadPriority;
} {
  const urlHash =
    website.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 40;
  const leadScore = Math.min(99, 45 + urlHash + Math.min(15, titleLen));
  const confidence = Math.min(
    99,
    50 + Math.min(30, Math.floor(bodyLen / 50_000)),
  );
  const priority: LeadPriority =
    leadScore >= 80 ? "HIGH" : leadScore >= 55 ? "MEDIUM" : "LOW";
  return { leadScore, confidence, priority };
}
