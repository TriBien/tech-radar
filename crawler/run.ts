import type {
  Article,
  MetaData,
  SourceKind,
  SourceRun,
  TechnologyMention,
} from "../shared/types.js";
import { classifySystemDesign } from "../shared/system-design.js";
import { buildRadar } from "./build-radar.js";
import { MAX_LLM_ARTICLES } from "./config.js";
import { dedupeArticles } from "./lib/dedupe.js";
import { heuristicEnrich } from "./lib/heuristics.js";
import { enrichWithLlm, llmAvailable, type Enrichment } from "./lib/llm.js";
import { loadArticles, pruneArticles, saveData } from "./store.js";
import { fetchDevTo } from "./sources/devto.js";
import { fetchGithubTrending } from "./sources/github.js";
import { fetchHackerNews } from "./sources/hackernews.js";
import { fetchReddit } from "./sources/reddit.js";
import { fetchRss } from "./sources/rss.js";
import { fetchReadingArticles } from "./sources/reading.js";

interface SourceDef {
  key: SourceKind;
  label: string;
  run: () => Promise<Article[]>;
}

const SOURCES: SourceDef[] = [
  { key: "rss", label: "RSS / Atom feeds", run: fetchRss },
  { key: "hackernews", label: "Hacker News", run: fetchHackerNews },
  { key: "devto", label: "DEV Community", run: fetchDevTo },
  { key: "reddit", label: "Reddit", run: fetchReddit },
  { key: "github", label: "GitHub Trending", run: fetchGithubTrending },
  { key: "reading", label: "Reading list", run: fetchReadingArticles },
];

interface Options {
  dryRun: boolean;
  noLlm: boolean;
  sources: Set<SourceKind> | null;
  sinceYear?: number;
  systemDesignOnly: boolean;
}

function parseOptions(): Options {
  const argv = process.argv.slice(2);
  const sourcesArg = argv.find((arg) => arg.startsWith("--sources="));
  const selected = sourcesArg
    ? (sourcesArg.split("=")[1].split(",").map((value) => value.trim()) as SourceKind[])
    : null;

  const sinceArg =
    argv.find((arg) => arg.startsWith("--since=")) ?? argv.find((arg) => arg.startsWith("--year="));
  const parsedYear = sinceArg
    ? Number(sinceArg.split("=")[1])
    : Number(process.env.INITIAL_CRAWL_YEAR || 0);
  const sinceYear = Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : undefined;
  if (sinceYear) process.env.INITIAL_CRAWL_YEAR = String(sinceYear);

  return {
    dryRun: argv.includes("--dry-run"),
    noLlm: argv.includes("--no-llm"),
    sources: selected && selected.length > 0 ? new Set(selected) : null,
    sinceYear,
    systemDesignOnly:
      argv.includes("--system-design-only") ||
      argv.includes("--system-design") ||
      process.env.SYSTEM_DESIGN_ONLY === "1",
  };
}

function applyHeuristic(article: Article): void {
  const needsTech = article.technologies.length === 0;
  const needsSummary = !article.summary || article.summary.length < 60;
  const needsInsight = !article.enriched && !article.problem && !article.approach;
  if (!needsTech && !needsSummary && !needsInsight && article.tags.length > 0) return;

  const heuristic = heuristicEnrich(article.title, article.summary);
  if (needsSummary) article.summary = heuristic.summary;
  if (needsTech) article.technologies = heuristic.technologies;
  if (article.tags.length === 0) article.tags = heuristic.tags;
  if (!article.enriched) {
    article.problem ??= heuristic.problem;
    article.approach ??= heuristic.approach;
    article.outcome ??= heuristic.outcome;
  }
}

function mergeTechnologies(
  primary: TechnologyMention[],
  secondary: TechnologyMention[],
): TechnologyMention[] {
  const merged = new Map<string, TechnologyMention>();
  for (const tech of primary) merged.set(tech.name.toLowerCase(), tech);
  for (const tech of secondary) {
    const key = tech.name.toLowerCase();
    if (!merged.has(key)) merged.set(key, tech);
  }
  return [...merged.values()].slice(0, 8);
}

function applySystemDesignTopics(article: Article): void {
  const match = classifySystemDesign(article);
  if (match.isSystemDesign && match.topics.length > 0) {
    article.topics = match.topics;
  } else {
    delete article.topics;
  }
}

function applyEnrichment(article: Article, enrichment: Enrichment): void {
  article.summary = enrichment.summary || article.summary;
  article.problem = enrichment.problem ?? article.problem;
  article.approach = enrichment.approach ?? article.approach;
  article.outcome = enrichment.outcome ?? article.outcome;
  article.technologies = mergeTechnologies(enrichment.technologies, article.technologies);
  article.tags = [...new Set([...enrichment.tags, ...article.tags])].slice(0, 6);
  article.enriched = true;
}

function log(message: string): void {
  console.log(message);
}

async function main(): Promise<void> {
  const options = parseOptions();
  const startedAt = Date.now();
  log("Tech Radar crawler");
  log("------------------");
  if (options.sinceYear) log(`Backfill from ${options.sinceYear} onward.`);
  if (options.systemDesignOnly) log("Filtering fetched items to system-design topics.");

  const existing = await loadArticles();
  const existingIds = new Set(existing.map((article) => article.id));
  log(`Loaded ${existing.length} existing article(s).`);

  const activeSources = SOURCES.filter(
    (source) => !options.sources || options.sources.has(source.key),
  );

  const runs: SourceRun[] = [];
  const fetched: Article[] = [];

  const results = await Promise.all(
    activeSources.map(async (source) => {
      try {
        const articles = await source.run();
        return { source, articles, error: undefined };
      } catch (error) {
        return { source, articles: [] as Article[], error: (error as Error).message };
      }
    }),
  );

  for (const result of results) {
    runs.push({
      name: result.source.label,
      kind: result.source.key,
      fetched: result.articles.length,
      kept: 0,
      error: result.error,
    });
    if (result.error) {
      log(`  ! ${result.source.label}: ${result.error}`);
    } else {
      log(`  + ${result.source.label}: ${result.articles.length} item(s)`);
    }
    fetched.push(...result.articles);
  }

  const sinceMs = options.sinceYear ? Date.UTC(options.sinceYear, 0, 1) : Number.NEGATIVE_INFINITY;
  let relevant = fetched.filter((article) => new Date(article.publishedAt).getTime() >= sinceMs);

  if (options.systemDesignOnly) {
    for (const article of relevant) applyHeuristic(article);
    relevant = relevant.filter((article) => classifySystemDesign(article).isSystemDesign);
    log(`  System-design filter kept ${relevant.length}/${fetched.length} fetched item(s).`);
  }

  const freshIds = new Set(relevant.map((article) => article.id));
  const base = [...existing, ...relevant];
  let articles = dedupeArticles(base);
  for (const article of articles) applyHeuristic(article);

  const sortedCandidates = articles
    .filter((article) => !article.enriched)
    .sort((a, b) => {
      const aNew = freshIds.has(a.id) ? 1 : 0;
      const bNew = freshIds.has(b.id) ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  const candidates =
    MAX_LLM_ARTICLES > 0 ? sortedCandidates.slice(0, MAX_LLM_ARTICLES) : sortedCandidates;

  let llmCount = 0;
  if (!options.noLlm && llmAvailable() && candidates.length > 0) {
    log(`Enriching ${candidates.length} article(s) with LLM…`);
    const enrichments = await enrichWithLlm(candidates);
    for (const article of candidates) {
      const enrichment = enrichments.get(article.id);
      if (enrichment) {
        applyEnrichment(article, enrichment);
        llmCount++;
      }
    }
    log(`  LLM enriched ${llmCount}/${candidates.length} article(s).`);
  } else if (options.noLlm) {
    log("LLM disabled (--no-llm); using heuristic enrichment.");
  } else if (!llmAvailable()) {
    log("No LLM credentials found; using heuristic enrichment.");
  }

  articles = pruneArticles(dedupeArticles(articles));
  for (const article of articles) {
    applyHeuristic(article);
    applySystemDesignTopics(article);
  }

  for (const run of runs) {
    run.kept = articles.filter((article) => article.source === run.kind).length;
  }

  const radar = buildRadar(articles);
  const newArticles = articles.filter((article) => !existingIds.has(article.id)).length;

  const meta: MetaData = {
    lastRun: new Date().toISOString(),
    lastRunMs: Date.now() - startedAt,
    llmUsed: llmCount > 0,
    newArticles,
    totalArticles: articles.length,
    sources: runs,
  };

  log("------------------");
  log(
    `Radar: ${radar.items.length} technologies across ${radar.stats.sources} source(s); ` +
      `${articles.length} articles retained (${newArticles} new).`,
  );

  if (options.dryRun) {
    log("Dry run: no files written.");
    return;
  }

  await saveData(articles, radar, meta);
  log("Wrote public/data/{articles,radar,meta}.json");
}

main().catch((error) => {
  console.error("Crawler failed:", error);
  process.exitCode = 1;
});
