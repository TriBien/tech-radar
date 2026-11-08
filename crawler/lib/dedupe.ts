import type { Article } from "../../shared/types.js";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_name",
  "ref",
  "referrer",
  "source",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "at_medium",
  "at_campaign",
]);

/** Normalise a URL so the same story from different sources collapses together. */
export function canonicalUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.protocol = "https:";
    url.port = "";
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    let path = url.pathname.replace(/\/+$/, "");
    if (!path) path = "/";
    url.pathname = path;
    return url.toString();
  } catch {
    return raw.trim().toLowerCase();
  }
}

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "for", "with", "at", "by",
  "from", "as", "is", "are", "was", "were", "be", "been", "being", "this", "that", "these",
  "those", "it", "its", "we", "our", "you", "your", "how", "why", "what", "when", "where",
  "who", "will", "can", "do", "does", "did", "not", "no", "into", "using", "use", "via",
  "about", "more", "than", "new", "s", "t",
]);

export function titleTokens(title: string): Set<string> {
  const tokens = title
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9+#. ]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^\.+|\.+$/g, ""))
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
  return new Set(tokens);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const token of small) {
    if (large.has(token)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

function containment(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  for (const token of small) {
    if (large.has(token)) intersection++;
  }
  return intersection / small.size;
}

interface DedupeEntry {
  article: Article;
  url: string;
  host: string;
  tokens: Set<string>;
}

function toEntry(article: Article): DedupeEntry {
  let host = "";
  try {
    host = new URL(canonicalUrl(article.url)).hostname;
  } catch {
    host = "";
  }
  return {
    article,
    url: canonicalUrl(article.url),
    host,
    tokens: titleTokens(article.title),
  };
}

export function qualityScore(article: Article): number {
  let score = 0;
  if (article.summary && article.summary.length > 80) score += 3;
  if (article.summary && article.summary.length > 180) score += 2;
  if (article.problem) score += 2;
  if (article.approach) score += 2;
  if (article.outcome) score += 1;
  if (article.image) score += 1;
  score += Math.min(article.technologies.length, 4);
  score += Math.min(article.tags.length, 3);
  score += Math.min(article.engagement, 1000) / 1000;
  if (article.enriched) score += 2;
  return score;
}

function isSameStory(a: DedupeEntry, b: DedupeEntry): boolean {
  if (a.url === b.url) return true;

  const similarity = jaccard(a.tokens, b.tokens);
  const contains = containment(a.tokens, b.tokens);
  const minTokens = Math.min(a.tokens.size, b.tokens.size);

  if (minTokens >= 4 && similarity >= 0.8) return true;
  if (minTokens >= 5 && contains >= 0.9 && similarity >= 0.65) return true;
  if (a.host && a.host === b.host && minTokens >= 4 && similarity >= 0.7) return true;

  return false;
}

/**
 * Deduplicate a set of articles. Keeps the highest-quality representative of
 * each story and merges metadata (technologies, tags, engagement) from dupes.
 */
export function dedupeArticles(articles: Article[]): Article[] {
  const sorted = [...articles].sort((a, b) => {
    const diff = qualityScore(b) - qualityScore(a);
    if (diff !== 0) return diff;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const byUrl = new Map<string, DedupeEntry>();
  const byHost = new Map<string, DedupeEntry[]>();
  const kept: DedupeEntry[] = [];

  for (const article of sorted) {
    if (!article.url || !article.title) continue;
    const entry = toEntry(article);

    const urlMatch = byUrl.get(entry.url);
    if (urlMatch) {
      mergeInto(urlMatch.article, article);
      continue;
    }

    const candidates = entry.host ? byHost.get(entry.host) ?? [] : [];
    // Limit cross-host comparisons to a reasonable window for performance.
    const recent = kept.slice(-400);
    const pool = candidates.length > 0 ? [...candidates, ...recent] : recent;
    const duplicate = pool.find((other) => isSameStory(entry, other));

    if (duplicate) {
      mergeInto(duplicate.article, article);
      byUrl.set(entry.url, duplicate);
      continue;
    }

    kept.push(entry);
    byUrl.set(entry.url, entry);
    if (entry.host) {
      const list = byHost.get(entry.host) ?? [];
      list.push(entry);
      byHost.set(entry.host, list);
    }
  }

  return kept.map((entry) => entry.article);
}

function mergeInto(target: Article, duplicate: Article): void {
  target.engagement = Math.max(target.engagement, duplicate.engagement);

  const techs = new Map(target.technologies.map((tech) => [tech.name.toLowerCase(), tech]));
  for (const tech of duplicate.technologies) {
    const key = tech.name.toLowerCase();
    if (!techs.has(key)) techs.set(key, tech);
  }
  target.technologies = [...techs.values()];

  const tags = new Set([...target.tags, ...duplicate.tags]);
  target.tags = [...tags];

  if (!target.image && duplicate.image) target.image = duplicate.image;
  if (!target.author && duplicate.author) target.author = duplicate.author;
  if (!target.summary || target.summary.length < 80) {
    if (duplicate.summary && duplicate.summary.length > target.summary.length) {
      target.summary = duplicate.summary;
    }
  }
  target.problem ??= duplicate.problem;
  target.approach ??= duplicate.approach;
  target.outcome ??= duplicate.outcome;
  target.enriched = target.enriched || duplicate.enriched;

  const earlier = new Date(duplicate.publishedAt).getTime();
  if (Number.isFinite(earlier) && earlier < new Date(target.publishedAt).getTime()) {
    target.publishedAt = duplicate.publishedAt;
  }
}

/** Stable article id derived from its canonical URL. */
export function articleKey(url: string, title: string): string {
  return canonicalUrl(url) || title.toLowerCase();
}
