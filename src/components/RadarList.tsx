import type { RadarItem, Ring } from "../../shared/types";
import { RINGS } from "../../shared/types";
import { QUADRANT_META, RING_META } from "../lib/radar";
import { TrendDownIcon, TrendUpIcon } from "./Icons";

interface RadarListProps {
  items: RadarItem[];
  onSelect: (item: RadarItem) => void;
}

export function RadarList({ items, onSelect }: RadarListProps) {
  return (
    <div className="radar-list">
      {RINGS.map((ring: Ring) => {
        const group = items
          .filter((item) => item.ring === ring)
          .sort((a, b) => b.score - a.score);
        if (group.length === 0) return null;

        return (
          <section key={ring} className="ring-group" aria-label={`${ring} ring`}>
            <header className="ring-group-head">
              <span className="ring-swatch" style={{ background: RING_META[ring].color }} />
              <h2>{ring}</h2>
              <span className="ring-count">{group.length}</span>
              <span className="ring-desc">{RING_META[ring].description}</span>
            </header>
            <div className="ring-items">
              {group.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="radar-row"
                  onClick={() => onSelect(item)}
                >
                  <span
                    className="tech-dot"
                    style={{ background: QUADRANT_META[item.quadrant]?.color ?? "#94a3b8" }}
                    aria-hidden="true"
                  />
                  <span className="radar-row-name">{item.name}</span>
                  <span className="radar-row-quadrant">{QUADRANT_META[item.quadrant]?.short}</span>
                  <span className="radar-row-count">{item.articleCount}</span>
                  <span className={`trend trend-${item.trend}`} aria-label={item.trend}>
                    {item.trend === "up" && <TrendUpIcon />}
                    {item.trend === "down" && <TrendDownIcon />}
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
