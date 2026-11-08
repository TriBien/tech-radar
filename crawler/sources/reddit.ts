import type { Article } from "../../shared/types.js";
import { REDDIT } from "../config.js";
import { fetchJson } from "../lib/http.js";
import { parseDate, summarizeText } from "../lib/util.js";
import { createArticle, isHttpUrl } from "./common.js";

interface RedditChild {
  data?: {
    title?: string;
    url?: string;
    permalink?: string;
    selftext?: string;
    author?: string;
    created_utc?: number;
    score?: number;
    num_comments?: number;
    subreddit?: string;
    thumbnail?: string;
    link_flair_text?: string;
    is_self?: boolean;
  };
}

interface RedditListing {
  data?: { children?: RedditChild[] };
}

async function fetchSubreddit(subreddit: string): Promise<Article[]> {
  const url = `https://www.reddit.com/r/${subreddit}/top.json?t=${REDDIT.timeframe}&limit=${REDDIT.limit}&raw_json=1`;
  const listing = await fetchJson<RedditListing>(url, {
    timeoutMs: 20_000,
    headers: { accept: "application/json" },
  });

  const articles: Article[] = [];
  for (const child of listing.data?.children ?? []) {
    const data = child.data;
    if (!data?.title) continue;
    const permalink = data.permalink ? `https://www.reddit.com${data.permalink}` : "";
    const url = data.is_self || !isHttpUrl(data.url) ? permalink : data.url;
    if (!isHttpUrl(url)) continue;

    const thumbnail = data.thumbnail?.startsWith("http") ? data.thumbnail : undefined;
    articles.push(
      createArticle({
        title: data.title,
        url,
        source: "reddit",
        sourceName: `r/${data.subreddit ?? subreddit}`,
        publishedAt: parseDate(
          data.created_utc ? new Date(data.created_utc * 1000).toISOString() : undefined,
          new Date(),
        ),
        summary: summarizeText(data.selftext || "", 500) || data.title,
        author: data.author,
        tags: [data.subreddit ?? subreddit, data.link_flair_text].filter(Boolean) as string[],
        engagement: (data.score ?? 0) + (data.num_comments ?? 0) * 2,
        image: thumbnail,
      }),
    );
  }
  return articles;
}

export async function fetchReddit(): Promise<Article[]> {
  const results: Article[] = [];
  for (const subreddit of REDDIT.subreddits) {
    try {
      results.push(...(await fetchSubreddit(subreddit)));
    } catch (error) {
      console.warn(`  ! Reddit r/${subreddit}: ${(error as Error).message}`);
    }
  }
  return results;
}
