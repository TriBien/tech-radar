import type { Article } from "../../shared/types.js";
import { GITHUB_TRENDING } from "../config.js";
import { fetchText } from "../lib/http.js";
import { stripHtml, truncate } from "../lib/util.js";
import { createArticle } from "./common.js";

interface TrendingRepo {
  path: string;
  description: string;
  language?: string;
  starsToday: number;
}

function parseTrending(html: string): TrendingRepo[] {
  const repos: TrendingRepo[] = [];
  const blocks = html.split('<article class="Box-row">').slice(1);

  for (const block of blocks) {
    const hrefMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="\/([^"]+)"/);
    if (!hrefMatch) continue;
    const path = hrefMatch[1].split("?")[0].replace(/\/$/, "");
    if (!/^[^/]+\/[^/]+$/.test(path)) continue;

    const descMatch = block.match(
      /<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/,
    );
    const langMatch = block.match(/itemprop="programmingLanguage"[^>]*>([^<]+)</);
    const starsMatch = block.match(/([\d,]+)\s+stars\s+today/);

    repos.push({
      path,
      description: stripHtml(descMatch?.[1] ?? ""),
      language: langMatch?.[1]?.trim(),
      starsToday: Number((starsMatch?.[1] ?? "0").replace(/,/g, "")) || 0,
    });
  }

  return repos.slice(0, GITHUB_TRENDING.limit);
}

export async function fetchGithubTrending(): Promise<Article[]> {
  const html = await fetchText(`https://github.com/trending?since=${GITHUB_TRENDING.since}`, {
    timeoutMs: 25_000,
    headers: { accept: "text/html" },
  });

  return parseTrending(html).map((repo) =>
    createArticle({
      title: repo.path,
      url: `https://github.com/${repo.path}`,
      source: "github",
      sourceName: "GitHub Trending",
      publishedAt: new Date().toISOString(),
      summary: truncate(repo.description || `Trending ${repo.language ?? "open source"} repository.`, 300),
      tags: [repo.language, "github-trending", "open-source"].filter(Boolean) as string[],
      engagement: repo.starsToday,
    }),
  );
}
