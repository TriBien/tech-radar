import { useEffect, useMemo, useState } from "react";
import type { Article, SourceKind } from "../../shared/types";
import { ArticleCard } from "./ArticleCard";
import { EmptyState } from "./EmptyState";

const PAGE_SIZE = 18;

const SORT_OPTIONS = [
  { key: "latest", label: "Latest" },
  { key: "trending", label: "Trending" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

interface FeedProps {
  articles: Article[];
  query: string;
  savedIds: Set<string>;
  onOpen: (article: Article) => void;
  onToggleSave: (id: string) => void;
}

export function Feed({ articles, query, savedIds, onOpen, onToggleSave }: FeedProps) {
  const [source, setSource] = useState<SourceKind | "all">("all");
  const [sort, setSort] = useState<SortKey>("latest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const sources = useMemo(() => {
    const counts = new Map<SourceKind, number>();
    for (const article of articles) {
      counts.set(article.source, (counts.get(article.source) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [articles]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = articles.filter((article) => {
      if (source !== "all" && article.source !== source) return false;
      if (!needle) return true;
      return (
        article.title.toLowerCase().includes(needle) ||
        article.summary.toLowerCase().includes(needle) ||
        article.technologies.some((tech) => tech.name.toLowerCase().includes(needle)) ||
        article.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });

    return list.sort((a, b) => {
      if (sort === "trending") {
        const scoreDiff = b.engagement - a.engagement;
        if (scoreDiff !== 0) return scoreDiff;
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }, [articles, query, source, sort]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, source, sort]);

  return (
    <section className="feed" aria-label="Article feed">
      <div className="feed-toolbar">
        <div className="segmented" role="group" aria-label="Sort">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={sort === option.key ? "is-active" : ""}
              onClick={() => setSort(option.key)}
              aria-pressed={sort === option.key}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="source-filter" role="group" aria-label="Filter by source">
          <button
            type="button"
            className={`source-pill ${source === "all" ? "is-active" : ""}`}
            onClick={() => setSource("all")}
          >
            All
          </button>
          {sources.map(([kind, count]) => (
            <button
              key={kind}
              type="button"
              className={`source-pill ${source === kind ? "is-active" : ""}`}
              onClick={() => setSource(source === kind ? "all" : kind)}
            >
              {labelForSource(kind)} <span className="pill-count">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="result-count">
        {filtered.length} {filtered.length === 1 ? "story" : "stories"}
        {query ? ` matching “${query}”` : ""}
      </p>

      {filtered.length === 0 ? (
        <EmptyState title="No stories found">Try a different search or source.</EmptyState>
      ) : (
        <>
          <div className="card-list">
            {filtered.slice(0, visible).map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                saved={savedIds.has(article.id)}
                onOpen={onOpen}
                onToggleSave={onToggleSave}
              />
            ))}
          </div>
          {visible < filtered.length && (
            <button
              type="button"
              className="load-more"
              onClick={() => setVisible((value) => value + PAGE_SIZE)}
            >
              Load more ({filtered.length - visible} left)
            </button>
          )}
        </>
      )}
    </section>
  );
}

function labelForSource(kind: SourceKind): string {
  switch (kind) {
    case "rss":
      return "Blogs";
    case "hackernews":
      return "HN";
    case "devto":
      return "DEV";
    case "reddit":
      return "Reddit";
    case "github":
      return "GitHub";
    case "reading":
      return "Reading";
    default:
      return kind;
  }
}
