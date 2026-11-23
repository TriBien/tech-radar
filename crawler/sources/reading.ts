import { readFile } from "node:fs/promises";
import path from "node:path";
import Parser from "rss-parser";
import type { Article } from "../../shared/types.js";
import { READING_URLS_FILE, type FeedConfig } from "../config.js";
import { fetchText } from "../lib/http.js";
import { parseFeed } from "./rss.js";

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

const FEED_SUFFIXES = ["/feed.atom", "/feed", "/feed.xml", "/rss", "/rss.xml", "/atom.xml", "/index.xml"];

const FEED_HOST_OVERRIDES: Record<string, string> = {
  "www.infoq.com": "https://feed.infoq.com/",
  "www.thoughtworks.com": "https://www.thoughtworks.com/rss/insights.xml",
  "dzone.com": "https://feeds.dzone.com/home",
};

function feedOverride(url: string): string | undefined {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return FEED_HOST_OVERRIDES[host];
  } catch {
    return undefined;
  }
}

function feedCandidates(url: string): string[] {
  const override = feedOverride(url);
  if (override) return [override];
  const base = url.replace(/\/+$/, "");
  return FEED_SUFFIXES.map((suffix) => `${base}${suffix}`);
}

async function resolveFeedUrl(url: string): Promise<string | undefined> {
  for (const candidate of feedCandidates(url)) {
    try {
      const xml = await fetchText(candidate, { timeoutMs: 15_000, retries: 0 });
      const parsed = await parser.parseString(xml);
      if ((parsed.items ?? []).length > 0) return candidate;
    } catch {
    }
  }
  return undefined;
}

function feedName(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    return host.charAt(0).toUpperCase() + host.slice(1);
  } catch {
    return url;
  }
}

async function loadReadingUrls(): Promise<string[]> {
  const content = await readFile(path.resolve(process.cwd(), READING_URLS_FILE), "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^https?:\/\//i.test(line));
}

export async function fetchReadingArticles(): Promise<Article[]> {
  const urls = await loadReadingUrls();
  const articles: Article[] = [];

  for (const url of urls) {
    const feedUrl = await resolveFeedUrl(url);
    if (!feedUrl) {
      console.warn(`  ! Reading list: no feed found for ${url}`);
      continue;
    }

    const feed: FeedConfig = { name: feedName(url), url: feedUrl, tags: ["reading-list"] };
    try {
      articles.push(...(await parseFeed(feed, "reading", feed.name)));
    } catch (error) {
      console.warn(`  ! Reading list ${url}: ${(error as Error).message}`);
    }
  }

  return articles;
}
