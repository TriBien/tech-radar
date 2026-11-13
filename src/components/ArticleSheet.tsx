import type { Article } from "../../shared/types";
import { formatDate, hostname } from "../lib/format";
import { QUADRANT_META, SOURCE_META } from "../lib/radar";
import {
  BookmarkFilledIcon,
  BookmarkIcon,
  ExternalIcon,
  SparkIcon,
  TrashIcon,
} from "./Icons";
import { Sheet } from "./Sheet";

interface ArticleSheetProps {
  article: Article;
  saved: boolean;
  onClose: () => void;
  onToggleSave: (id: string) => void;
  onDelete: (article: Article) => void;
  onTechClick: (name: string) => void;
}

export function ArticleSheet({
  article,
  saved,
  onClose,
  onToggleSave,
  onDelete,
  onTechClick,
}: ArticleSheetProps) {
  const source = SOURCE_META[article.source] ?? { label: article.sourceName, className: "src-rss" };
  const titleId = `article-title-${article.id}`;

  return (
    <Sheet onClose={onClose} labelledBy={titleId}>
      <div className="sheet-body">
        <div className="card-meta">
          <span className={`source-badge ${source.className}`}>{source.label}</span>
          <span className="dot-sep" aria-hidden="true" />
          <span>{article.sourceName}</span>
          <span className="dot-sep" aria-hidden="true" />
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        </div>

        <h2 id={titleId} className="sheet-title">
          {article.title}
        </h2>

        <div className="sheet-submeta">
          {article.author && <span>By {article.author}</span>}
          <span>{hostname(article.url)}</span>
          {article.enriched && (
            <span className="ai-badge">
              <SparkIcon size={12} /> AI summary
            </span>
          )}
        </div>

        {article.image && (
          <img
            className="sheet-image"
            src={article.image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}

        {article.summary && <p className="sheet-summary">{article.summary}</p>}

        {(article.problem || article.approach || article.outcome) && (
          <div className="sheet-insights">
            {article.problem && (
              <div className="sheet-insight insight-problem">
                <span className="insight-label">Real-world problem</span>
                <p>{article.problem}</p>
              </div>
            )}
            {article.approach && (
              <div className="sheet-insight insight-approach">
                <span className="insight-label">How they used it</span>
                <p>{article.approach}</p>
              </div>
            )}
            {article.outcome && (
              <div className="sheet-insight insight-outcome">
                <span className="insight-label">Outcome</span>
                <p>{article.outcome}</p>
              </div>
            )}
          </div>
        )}

        {article.technologies.length > 0 && (
          <div className="sheet-section">
            <h3>Technologies</h3>
            <div className="tech-chips">
              {article.technologies.map((tech) => (
                <button
                  key={tech.name}
                  type="button"
                  className="tech-chip tech-chip-button"
                  onClick={() => onTechClick(tech.name)}
                >
                  <i
                    className="tech-dot"
                    style={{ background: QUADRANT_META[tech.quadrant]?.color ?? "#94a3b8" }}
                    aria-hidden="true"
                  />
                  {tech.name}
                  <span className="tech-ring">{tech.ring}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {article.tags.length > 0 && (
          <div className="sheet-section">
            <h3>Tags</h3>
            <div className="tag-row">
              {article.tags.map((tag) => (
                <span key={tag} className="tag">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sheet-actions">
        <a
          className="btn btn-primary"
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read the original <ExternalIcon />
        </a>
        <button
          type="button"
          className={`btn btn-ghost ${saved ? "is-saved" : ""}`}
          onClick={() => onToggleSave(article.id)}
          aria-pressed={saved}
        >
          {saved ? <BookmarkFilledIcon size={17} /> : <BookmarkIcon size={17} />}
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-danger"
          onClick={() => onDelete(article)}
        >
          <TrashIcon size={17} />
          Delete
        </button>
      </div>
    </Sheet>
  );
}
