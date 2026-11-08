import type { Article, RadarItem } from "../../shared/types";
import { relativeTime } from "../lib/format";
import { QUADRANT_META, RING_META } from "../lib/radar";
import { TrendDownIcon, TrendUpIcon } from "./Icons";
import { Sheet } from "./Sheet";

interface TechSheetProps {
  item: RadarItem;
  articles: Article[];
  onClose: () => void;
  onOpenArticle: (article: Article) => void;
}

const TREND_LABEL: Record<RadarItem["trend"], string> = {
  up: "Rising",
  down: "Cooling",
  steady: "Steady",
};

export function TechSheet({ item, articles, onClose, onOpenArticle }: TechSheetProps) {
  const quadrant = QUADRANT_META[item.quadrant];
  const ring = RING_META[item.ring];
  const related = item.articleIds
    .map((id) => articles.find((article) => article.id === id))
    .filter((article): article is Article => Boolean(article))
    .slice(0, 6);
  const titleId = `tech-title-${item.id}`;

  return (
    <Sheet onClose={onClose} labelledBy={titleId}>
      <div className="sheet-body">
        <div className="tech-sheet-head">
          <span
            className="tech-orb"
            style={{
              background: quadrant.color,
              boxShadow: `0 0 30px color-mix(in srgb, ${quadrant.color} 40%, transparent)`,
            }}
            aria-hidden="true"
          />
          <div>
            <h2 id={titleId} className="sheet-title">
              {item.name}
            </h2>
            <div className="badge-row">
              <span
                className="badge"
                style={{
                  color: ring.color,
                  borderColor: `color-mix(in srgb, ${ring.color} 40%, transparent)`,
                }}
              >
                {item.ring}
              </span>
              <span
                className="badge"
                style={{
                  color: quadrant.color,
                  borderColor: `color-mix(in srgb, ${quadrant.color} 40%, transparent)`,
                }}
              >
                {quadrant.short}
              </span>
              <span className={`trend trend-${item.trend}`}>
                {item.trend === "up" && <TrendUpIcon />}
                {item.trend === "down" && <TrendDownIcon />}
                {TREND_LABEL[item.trend]}
              </span>
            </div>
          </div>
        </div>

        <p className="ring-explainer">{ring.description}</p>
        {item.description && <p className="sheet-summary">{item.description}</p>}

        <div className="stat-grid">
          <div>
            <strong>{item.articleCount}</strong>
            <span>stories</span>
          </div>
          <div>
            <strong>{item.recentCount}</strong>
            <span>last 21 days</span>
          </div>
          <div>
            <strong>{item.tags.length}</strong>
            <span>topics</span>
          </div>
          <div>
            <strong>{relativeTime(item.lastSeen).replace(" ago", "")}</strong>
            <span>last seen</span>
          </div>
        </div>

        {item.tags.length > 0 && (
          <div className="tag-row">
            {item.tags.map((tag) => (
              <span key={tag} className="tag">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {related.length > 0 && (
          <div className="sheet-section">
            <h3>How teams used it</h3>
            <ul className="related-list">
              {related.map((article) => (
                <li key={article.id}>
                  <button type="button" onClick={() => onOpenArticle(article)}>
                    <span className="related-title">{article.title}</span>
                    <span className="related-meta">
                      {article.sourceName} · {relativeTime(article.publishedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Sheet>
  );
}
