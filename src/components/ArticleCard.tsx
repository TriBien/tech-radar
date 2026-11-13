import type { Article } from "../../shared/types";
import { relativeTime, hostname } from "../lib/format";
import { QUADRANT_META, SOURCE_META } from "../lib/radar";
import { BookmarkFilledIcon, BookmarkIcon, TrashIcon } from "./Icons";

interface ArticleCardProps {
  article: Article;
  saved: boolean;
  onOpen: (article: Article) => void;
  onToggleSave: (id: string) => void;
  onDelete: (article: Article) => void;
}

export function ArticleCard({
  article,
  saved,
  onOpen,
  onToggleSave,
  onDelete,
}: ArticleCardProps) {
  const source = SOURCE_META[article.source] ?? { label: article.sourceName, className: "src-rss" };
  const host = hostname(article.url);

  return (
    <article
      className="card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(article)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(article);
        }
      }}
      aria-label={article.title}
    >
      <button
        type="button"
        className={`save-btn ${saved ? "is-saved" : ""}`}
        aria-label={saved ? "Remove bookmark" : "Save article"}
        aria-pressed={saved}
        onClick={(event) => {
          event.stopPropagation();
          onToggleSave(article.id);
        }}
      >
        {saved ? <BookmarkFilledIcon size={18} /> : <BookmarkIcon size={18} />}
      </button>

      <button
        type="button"
        className="save-btn card-delete"
        aria-label="Delete article"
        title="Delete article"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(article);
        }}
      >
        <TrashIcon size={17} />
      </button>

      <div className="card-meta">
        <span className={`source-badge ${source.className}`}>{source.label}</span>
        <span className="dot-sep" aria-hidden="true" />
        <span>{article.sourceName}</span>
        <span className="dot-sep" aria-hidden="true" />
        <time dateTime={article.publishedAt}>{relativeTime(article.publishedAt)}</time>
      </div>

      <h2 className="card-title">{article.title}</h2>

      {article.summary && <p className="card-summary">{article.summary}</p>}

      {(article.problem || article.approach) && (
        <div className="card-insights">
          {article.problem && (
            <div className="insight insight-problem">
              <span>Problem</span>
              <p>{article.problem}</p>
            </div>
          )}
          {article.approach && (
            <div className="insight insight-approach">
              <span>Approach</span>
              <p>{article.approach}</p>
            </div>
          )}
        </div>
      )}

      <div className="card-footer">
        <div className="tech-chips">
          {article.technologies.slice(0, 4).map((tech) => (
            <span key={tech.name} className="tech-chip">
              <i
                className="tech-dot"
                style={{ background: QUADRANT_META[tech.quadrant]?.color ?? "#94a3b8" }}
                aria-hidden="true"
              />
              {tech.name}
            </span>
          ))}
        </div>
        <span className="card-host">{host}</span>
      </div>
    </article>
  );
}
