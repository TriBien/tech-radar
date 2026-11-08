import type { Article } from "../../shared/types.js";
import { HN } from "../config.js";
import { fetchJson } from "../lib/http.js";
import { parseDate, truncate } from "../lib/util.js";
import { createArticle, isHttpUrl } from "./common.js";

interface HnHit {
  objectID: string;
  title?: string;
  url?: string | null;
  story_url?: string | null;
  author?: string;
  created_at?: string;
  points?: number;
  num_comments?: number;
  story_text?: string | null;
}

interface HnResponse {
  hits?: HnHit[];
}

function toArticle(hit: HnHit): Article | null {
  if (!hit.title || !hit.objectID) return null;
  const discussion = `https://news.ycombinator.com/item?id=${hit.objectID}`;
  const url = isHttpUrl(hit.url) ? hit.url : isHttpUrl(hit.story_url) ? hit.story_url : discussion;
  const points = hit.points ?? 0;
  const comments = hit.num_comments ?? 0;

  return createArticle({
    title: hit.title,
    url,
    source: "hackernews",
    sourceName: "Hacker News",
    publishedAt: parseDate(hit.created_at, new Date()),
    summary: hit.story_text || `Hacker News discussion with ${comments} comments.`,
    author: hit.author,
    tags: ["hackernews"],
    engagement: points + comments * 2,
  });
}

export async function fetchHackerNews(): Promise<Article[]> {
  const frontPage = await fetchJson<HnResponse>(
    `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=${HN.frontPageLimit}`,
    { timeoutMs: 20_000 },
  );

  const since = Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60;
  const recent = await fetchJson<HnResponse>(
    `https://hn.algolia.com/api/v1/search?tags=story&numericFilters=${encodeURIComponent(
      `points>${HN.minPoints},created_at_i>${since}`,
    )}&hitsPerPage=${HN.recentLimit}`,
    { timeoutMs: 20_000 },
  );

  const hits = [...(frontPage.hits ?? []), ...(recent.hits ?? [])];
  const articles: Article[] = [];
  for (const hit of hits) {
    const article = toArticle(hit);
    if (article) {
      article.summary = truncate(article.summary, 300);
      articles.push(article);
    }
  }
  return articles;
}
