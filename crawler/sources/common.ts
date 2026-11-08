import type { Article, SourceKind } from "../../shared/types.js";
import { canonicalUrl } from "../lib/dedupe.js";
import { hashId, stripHtml, truncate } from "../lib/util.js";

export interface NewArticle {
  title: string;
  url: string;
  source: SourceKind;
  sourceName: string;
  publishedAt: string;
  summary?: string;
  author?: string;
  tags?: string[];
  engagement?: number;
  image?: string;
  lang?: string;
}

export function createArticle(input: NewArticle): Article {
  const url = canonicalUrl(input.url);
  const title = stripHtml(input.title).replace(/\s+/g, " ").trim();
  return {
    id: hashId(url || title),
    title,
    url,
    source: input.source,
    sourceName: input.sourceName,
    author: typeof input.author === "string" ? input.author.trim() || undefined : undefined,
    publishedAt: input.publishedAt,
    fetchedAt: new Date().toISOString(),
    summary: truncate(stripHtml(input.summary ?? ""), 1200),
    technologies: [],
    tags: [...new Set((input.tags ?? []).map((tag) => tag.toLowerCase().trim()).filter(Boolean))],
    engagement: input.engagement ?? 0,
    image: input.image,
    lang: input.lang,
    enriched: false,
  };
}

export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
