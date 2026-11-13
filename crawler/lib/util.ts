import { createHash } from "node:crypto";
import { stripHtml, truncate } from "../../shared/text.js";

export { slugify, stripHtml, truncate } from "../../shared/text.js";

export function hashId(input: string, length = 16): string {
  return createHash("sha1").update(input).digest("hex").slice(0, length);
}

/** Cheap extractive summary: first sentences up to a character budget. */
export function summarizeText(input: string, max = 240): string {
  const clean = stripHtml(input);
  if (!clean) return "";
  const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [clean];
  let out = "";
  for (const sentence of sentences) {
    if ((out + sentence).length > max && out.length > 0) break;
    out += sentence;
  }
  if (!out) out = clean;
  return truncate(out.trim(), max);
}

export function parseDate(input: string | undefined | null, fallback = new Date()): string {
  if (!input) return fallback.toISOString();
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return fallback.toISOString();
  return parsed.toISOString();
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function isRecent(iso: string, days: number): boolean {
  const ts = new Date(iso).getTime();
  return Number.isFinite(ts) && ts >= daysAgo(days).getTime();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run async tasks with a concurrency cap, preserving order. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export function pick<T>(items: T[], seed: number): T {
  return items[seed % items.length];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
