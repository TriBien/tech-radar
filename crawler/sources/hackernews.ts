import type { Article } from "../../shared/types.js";
import { HN, initialCrawlYear } from "../config.js";
import { fetchJson } from "../lib/http.js";
import { parseDate, sleep, truncate } from "../lib/util.js";
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
  nbHits?: number;
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

interface ArchiveState {
  seen: Set<string>;
  articles: Article[];
}

async function fetchArchiveRange(
  query: string,
  start: number,
  end: number,
  state: ArchiveState,
): Promise<void> {
  const params = new URLSearchParams({
    query,
    tags: "story",
    numericFilters: `created_at_i>=${start},created_at_i<${end}`,
    hitsPerPage: String(HN.backfillHitsPerPage),
  });
  const response = await fetchJson<HnResponse>(
    `https://hn.algolia.com/api/v1/search?${params.toString()}`,
    { timeoutMs: 30_000 },
  );

  const hits = response.hits ?? [];
  const total = response.nbHits ?? hits.length;
  const canSplit = end - start > 86_400;

  if (total > HN.backfillHitsPerPage && canSplit) {
    const mid = Math.floor((start + end) / 2);
    await fetchArchiveRange(query, start, mid, state);
    await fetchArchiveRange(query, mid, end, state);
    await sleep(HN.backfillPauseMs);
    return;
  }

  for (const hit of hits) {
    if (!hit.objectID || state.seen.has(hit.objectID)) continue;
    const article = toArticle(hit);
    if (!article) continue;
    state.seen.add(hit.objectID);
    article.summary = truncate(article.summary, 300);
    article.tags = [...new Set([...article.tags, "archive"])].slice(0, 6);
    state.articles.push(article);
  }

  await sleep(HN.backfillPauseMs);
}

async function fetchHackerNewsArchive(sinceYear: number): Promise<Article[]> {
  const start = Math.floor(Date.UTC(sinceYear, 0, 1) / 1000);
  const end = Math.floor(Date.now() / 1000) + 1;
  const state: ArchiveState = { seen: new Set(), articles: [] };

  for (const query of HN.backfillQueries) {
    const before = state.articles.length;
    await fetchArchiveRange(query, start, end, state);
    console.log(`  + HN archive "${query}": ${state.articles.length - before} item(s)`);
  }

  return state.articles;
}

export async function fetchHackerNews(): Promise<Article[]> {
  const backfillYear = initialCrawlYear();
  if (backfillYear) return fetchHackerNewsArchive(backfillYear);

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
