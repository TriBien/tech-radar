import type { Article } from "../../shared/types.js";
import { DEVTO } from "../config.js";
import { fetchJson } from "../lib/http.js";
import { parseDate } from "../lib/util.js";
import { createArticle, isHttpUrl } from "./common.js";

interface DevToArticle {
  id: number;
  title?: string;
  description?: string;
  url?: string;
  canonical_url?: string;
  published_at?: string;
  positive_reactions_count?: number;
  comments_count?: number;
  cover_image?: string | null;
  tag_list?: string[];
  user?: { name?: string };
  reading_time_minutes?: number;
}

export async function fetchDevTo(): Promise<Article[]> {
  const items = await fetchJson<DevToArticle[]>(
    `https://dev.to/api/articles?top=${DEVTO.topDays}&per_page=${DEVTO.perPage}`,
    { timeoutMs: 20_000 },
  );

  const articles: Article[] = [];
  for (const item of items) {
    if (!item.title) continue;
    const url = isHttpUrl(item.canonical_url) ? item.canonical_url : item.url;
    if (!isHttpUrl(url)) continue;

    articles.push(
      createArticle({
        title: item.title,
        url,
        source: "devto",
        sourceName: "DEV Community",
        publishedAt: parseDate(item.published_at, new Date()),
        summary: item.description ?? "",
        author: item.user?.name,
        tags: [...(item.tag_list ?? []), "devto"],
        engagement: (item.positive_reactions_count ?? 0) + (item.comments_count ?? 0) * 2,
        image: item.cover_image ?? undefined,
      }),
    );
  }
  return articles;
}
