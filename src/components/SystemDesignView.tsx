import { useEffect, useMemo, useState } from "react";
import type { Article } from "../../shared/types";
import {
  SYSTEM_DESIGN_TOPICS,
  SYSTEM_DESIGN_TOPIC_META,
  classifySystemDesign,
  type SystemDesignTopic,
} from "../../shared/system-design";
import { ArchitectureIcon } from "./Icons";
import { ArticleCard } from "./ArticleCard";
import { EmptyState } from "./EmptyState";

const PAGE_SIZE = 18;

const SORT_OPTIONS = [
  { key: "latest", label: "Latest" },
  { key: "trending", label: "Trending" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];
type TopicFilter = SystemDesignTopic | "all";

interface SystemDesignViewProps {
  articles: Article[];
  query: string;
  savedIds: Set<string>;
  onOpen: (article: Article) => void;
  onToggleSave: (id: string) => void;
}

interface Entry {
  article: Article;
  topics: SystemDesignTopic[];
  score: number;
}

function isTopic(value: string): value is SystemDesignTopic {
  return (SYSTEM_DESIGN_TOPICS as readonly string[]).includes(value);
}

export function SystemDesignView({
  articles,
  query,
  savedIds,
  onOpen,
  onToggleSave,
}: SystemDesignViewProps) {
  const [topic, setTopic] = useState<TopicFilter>("all");
  const [sort, setSort] = useState<SortKey>("latest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const entries = useMemo<Entry[]>(() => {
    const result: Entry[] = [];
    for (const article of articles) {
      if (article.source === "github") continue;
      const stored = (article.topics ?? []).filter(isTopic);
      const match = classifySystemDesign(article);
      const topics = stored.length > 0 ? stored : match.topics;
      if (!match.isSystemDesign && topics.length === 0) continue;
      result.push({ article, topics, score: match.score });
    }
    return result;
  }, [articles]);

  const topicCounts = useMemo(() => {
    const counts = new Map<SystemDesignTopic, number>();
    for (const entry of entries) {
      for (const id of entry.topics) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return counts;
  }, [entries]);

  const availableTopics = useMemo(
    () => SYSTEM_DESIGN_TOPICS.filter((id) => (topicCounts.get(id) ?? 0) > 0),
    [topicCounts],
  );

  const sourceCount = useMemo(
    () => new Set(entries.map((entry) => entry.article.sourceName)).size,
    [entries],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = entries.filter((entry) => {
      if (topic !== "all" && !entry.topics.includes(topic)) return false;
      if (!needle) return true;
      const { article } = entry;
      return (
        article.title.toLowerCase().includes(needle) ||
        article.summary.toLowerCase().includes(needle) ||
        article.sourceName.toLowerCase().includes(needle) ||
        article.tags.some((tag) => tag.toLowerCase().includes(needle)) ||
        article.technologies.some((tech) => tech.name.toLowerCase().includes(needle)) ||
        entry.topics.some((id) => SYSTEM_DESIGN_TOPIC_META[id].label.toLowerCase().includes(needle))
      );
    });

    return list.sort((a, b) => {
      if (sort === "trending") {
        const engagementDiff = b.article.engagement - a.article.engagement;
        if (engagementDiff !== 0) return engagementDiff;
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;
      }
      return new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime();
    });
  }, [entries, query, topic, sort]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, topic, sort]);

  return (
    <section className="system-design" aria-label="System design collection">
      <div className="sd-hero">
        <div className="sd-hero-main">
          <span className="sd-kicker">
            <ArchitectureIcon size={15} /> Architecture library
          </span>
          <h2>System design &amp; software architecture</h2>
          <p>
            Posts, articles and blogs about how real teams design distributed systems, scale
            infrastructure and make architectural trade-offs — collected from popular engineering
            pages.
          </p>
        </div>
        <div className="sd-stats" aria-label="Collection stats">
          <div>
            <strong>{entries.length}</strong>
            <span>articles</span>
          </div>
          <div>
            <strong>{sourceCount}</strong>
            <span>sources</span>
          </div>
          <div>
            <strong>{availableTopics.length}</strong>
            <span>topics</span>
          </div>
        </div>
      </div>

      <div className="filter-rows">
        <div className="chip-row" role="group" aria-label="Filter by system design topic">
          <button
            type="button"
            className={`filter-chip ${topic === "all" ? "is-active" : ""}`}
            onClick={() => setTopic("all")}
            aria-pressed={topic === "all"}
          >
            All topics <span className="pill-count">{entries.length}</span>
          </button>
          {availableTopics.map((id) => {
            const active = topic === id;
            const meta = SYSTEM_DESIGN_TOPIC_META[id];
            return (
              <button
                key={id}
                type="button"
                className={`filter-chip ${active ? "is-active" : ""}`}
                style={{ "--chip": meta.color } as React.CSSProperties}
                onClick={() => setTopic(active ? "all" : id)}
                aria-pressed={active}
                title={meta.description}
              >
                <span className="chip-dot" />
                {meta.label}
                <span className="pill-count">{topicCounts.get(id)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sd-toolbar">
        <div className="segmented" role="group" aria-label="Sort system design articles">
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

        <p className="result-count">
          {filtered.length} {filtered.length === 1 ? "article" : "articles"}
          {topic !== "all" ? ` in ${SYSTEM_DESIGN_TOPIC_META[topic].label}` : ""}
          {query ? ` matching “${query}”` : ""}
        </p>
      </div>

      {filtered.length === 0 ? (
        entries.length === 0 ? (
          <EmptyState title="No system design articles yet">
            Run the crawler to collect architecture posts from engineering blogs, or search the full
            feed for a specific topic.
          </EmptyState>
        ) : (
          <EmptyState title="No articles match">
            Try another topic or search for a different system, pattern or technology.
          </EmptyState>
        )
      ) : (
        <>
          <div className="card-list">
            {filtered.slice(0, visible).map(({ article, topics }) => (
              <div key={article.id} className="sd-card-wrap">
                <ArticleCard
                  article={article}
                  saved={savedIds.has(article.id)}
                  onOpen={onOpen}
                  onToggleSave={onToggleSave}
                />
                {topics.length > 0 && (
                  <div className="sd-card-topics" aria-label="System design topics">
                    {topics.slice(0, 3).map((id) => (
                      <span
                        key={id}
                        className="sd-topic-tag"
                        style={{ "--topic": SYSTEM_DESIGN_TOPIC_META[id].color } as React.CSSProperties}
                      >
                        {SYSTEM_DESIGN_TOPIC_META[id].label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
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
