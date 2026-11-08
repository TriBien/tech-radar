import Parser from "rss-parser";
import type { Article } from "../../shared/types.js";
import { CRAWL_DAYS, FEEDS, type FeedConfig } from "../config.js";
import { fetchText } from "../lib/http.js";
import { daysAgo, parseDate } from "../lib/util.js";
import { createArticle, isHttpUrl } from "./common.js";

interface RssItem {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  isoDate?: string;
  creator?: string;
  author?: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  categories?: string[];
  enclosure?: { url?: string };
  "dc:creator"?: string;
}

const parser: Parser<unknown, RssItem> = new Parser();

async function parseFeed(feed: FeedConfig): Promise<Article[]> {
  const xml = await fetchText(feed.url, { timeoutMs: 25_000, retries: 1 });
  const parsed = await parser.parseString(xml);
  const cutoff = daysAgo(CRAWL_DAYS + 1).getTime();
  const articles: Article[] = [];

  for (const item of parsed.items ?? []) {
    const link = item.link || item.guid;
    if (!isHttpUrl(link) || !item.title) continue;

    const publishedAt = parseDate(item.isoDate || item.pubDate, new Date());
    // Feeds sometimes omit dates; keep those, but drop clearly old items.
    if ((item.isoDate || item.pubDate) && new Date(publishedAt).getTime() < cutoff) continue;

    const summary = item.contentSnippet || item.summary || item.content || "";
    const categories = (item.categories ?? []).filter(
      (category): category is string => typeof category === "string",
    );

    articles.push(
      createArticle({
        title: item.title,
        url: link,
        source: "rss",
        sourceName: feed.name,
        publishedAt,
        summary,
        author: item.creator || item["dc:creator"] || item.author,
        tags: [...(feed.tags ?? []), ...categories].slice(0, 6),
        engagement: 0,
        image: item.enclosure?.url,
      }),
    );
  }

  return articles;
}

export async function fetchRss(): Promise<Article[]> {
  const results: Article[] = [];
  const groups = chunk(FEEDS, 5);

  for (const group of groups) {
    const settled = await Promise.allSettled(group.map((feed) => parseFeed(feed)));
    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      if (result.status === "fulfilled") {
        results.push(...result.value);
      } else {
        console.warn(`  ! RSS ${group[i].name}: ${(result.reason as Error).message}`);
      }
    }
  }

  return results;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
