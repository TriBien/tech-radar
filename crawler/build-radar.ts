import type {
  Article,
  Quadrant,
  RadarData,
  RadarItem,
  Ring,
} from "../shared/types.js";
import { QUADRANTS, RINGS } from "../shared/types.js";
import { hashId, slugify, stripHtml, truncate } from "./lib/util.js";

const RECENT_DAYS = 21;
const PREVIOUS_DAYS = 60;
const MAX_PER_QUADRANT = 20;

function ageDays(iso: string, now: number): number {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 999;
  return Math.max(0, (now - ts) / (24 * 60 * 60 * 1000));
}

function recencyWeight(iso: string, now: number): number {
  const age = ageDays(iso, now);
  if (age <= 14) return 1.6;
  if (age <= 45) return 1.0;
  return 0.5;
}

function maxKey<V>(votes: Map<string, number>, order: readonly V[], fallback: V): V {
  let best: V = fallback;
  let bestScore = -1;
  for (const key of order) {
    const score = votes.get(key as string) ?? 0;
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}

interface Aggregate {
  name: string;
  quadrantVotes: Map<string, number>;
  ringVotes: Map<string, number>;
  articles: Map<string, Article>;
  tags: Map<string, number>;
  engagement: number;
}

function descriptionFor(articles: Article[]): string {
  const sorted = [...articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  for (const article of sorted) {
    const candidate = article.approach || article.problem || article.summary;
    const clean = stripHtml(candidate || "");
    if (clean.length > 40) return truncate(clean, 200);
  }
  return "";
}

export function buildRadar(articles: Article[], now = Date.now()): RadarData {
  const aggregates = new Map<string, Aggregate>();

  for (const article of articles) {
    const weight = recencyWeight(article.publishedAt, now);
    for (const tech of article.technologies) {
      if (!tech.name) continue;
      const key = tech.name.toLowerCase();
      let agg = aggregates.get(key);
      if (!agg) {
        agg = {
          name: tech.name,
          quadrantVotes: new Map(),
          ringVotes: new Map(),
          articles: new Map(),
          tags: new Map(),
          engagement: 0,
        };
        aggregates.set(key, agg);
      }
      agg.quadrantVotes.set(
        tech.quadrant,
        (agg.quadrantVotes.get(tech.quadrant) ?? 0) + weight,
      );
      agg.ringVotes.set(tech.ring, (agg.ringVotes.get(tech.ring) ?? 0) + weight);
      agg.articles.set(article.id, article);
      agg.engagement = Math.max(agg.engagement, article.engagement);
      for (const tag of article.tags) {
        agg.tags.set(tag, (agg.tags.get(tag) ?? 0) + 1);
      }
    }
  }

  const items: RadarItem[] = [];

  for (const agg of aggregates.values()) {
    const articleList = [...agg.articles.values()];
    if (articleList.length === 0) continue;

    const quadrant = maxKey<Quadrant>(agg.quadrantVotes, QUADRANTS, "Tools");
    const ring = maxKey<Ring>(agg.ringVotes, RINGS, "Assess");

    const recentCount = articleList.filter(
      (article) => ageDays(article.publishedAt, now) <= RECENT_DAYS,
    ).length;
    const previousCount = articleList.filter((article) => {
      const age = ageDays(article.publishedAt, now);
      return age > RECENT_DAYS && age <= PREVIOUS_DAYS;
    }).length;

    let trend: RadarItem["trend"] = "steady";
    if (previousCount === 0 && recentCount > 0) trend = "up";
    else if (recentCount > previousCount * 1.25) trend = "up";
    else if (previousCount > 0 && recentCount < previousCount * 0.7) trend = "down";

    const dated = [...articleList].sort(
      (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
    );
    const firstSeen = dated[0]?.publishedAt ?? new Date(now).toISOString();
    const lastSeen = dated[dated.length - 1]?.publishedAt ?? new Date(now).toISOString();

    const ringBonus: Record<Ring, number> = { Adopt: 12, Trial: 8, Assess: 3, Hold: 1 };
    const score =
      articleList.length * 6 +
      recentCount * 9 +
      Math.log10(agg.engagement + 10) * 2 +
      ringBonus[ring] +
      (trend === "up" ? 4 : trend === "down" ? -2 : 0);

    const tagEntries = [...agg.tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const related = [...articleList]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 8)
      .map((article) => article.id);

    items.push({
      id: `${slugify(agg.name) || "tech"}-${hashId(agg.name.toLowerCase(), 6)}`,
      name: agg.name,
      quadrant,
      ring,
      description: descriptionFor(articleList),
      articleCount: articleList.length,
      recentCount,
      previousCount,
      trend,
      firstSeen,
      lastSeen,
      articleIds: related,
      tags: tagEntries.map(([tag]) => tag),
      score: Math.round(score * 10) / 10,
    });
  }

  items.sort((a, b) => b.score - a.score);

  const byQuadrant = new Map<Quadrant, RadarItem[]>();
  for (const item of items) {
    const list = byQuadrant.get(item.quadrant) ?? [];
    if (list.length < MAX_PER_QUADRANT) list.push(item);
    byQuadrant.set(item.quadrant, list);
  }

  const selected = [...byQuadrant.values()].flat().sort((a, b) => b.score - a.score);
  const sources = new Set(articles.map((article) => article.sourceName));

  return {
    generatedAt: new Date(now).toISOString(),
    periodDays: PREVIOUS_DAYS,
    items: selected,
    stats: {
      articles: articles.length,
      sources: sources.size,
      technologies: selected.length,
    },
  };
}
