/**
 * HTTP client for Guarded backend lead APIs.
 * LEAD_API_URL — main backend (default http://localhost:8080)
 * LEAD_INTELLIGENCE_URL — scrape-only port if split (default = LEAD_API_URL)
 */

export function normalizeServiceBaseUrl(
  raw: string | undefined,
  fallback: string,
): string {
  return (raw ?? fallback).replace(/\/$/, "");
}

export function getLeadApiBase(): string {
  return normalizeServiceBaseUrl(
    process.env["LEAD_API_URL"],
    "http://localhost:8080",
  );
}

export function getLeadIntelligenceBase(): string {
  return normalizeServiceBaseUrl(
    process.env["LEAD_INTELLIGENCE_URL"],
    getLeadApiBase(),
  );
}

export async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : text.slice(0, 200);
    throw new Error(`${res.status} ${msg}`);
  }
  return body as T;
}
