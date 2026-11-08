import { useMemo, useState } from "react";
import type { Quadrant, RadarItem, Ring } from "../../shared/types";
import { QUADRANTS, RINGS } from "../../shared/types";
import { QUADRANT_META, RING_META } from "../lib/radar";
import { EmptyState } from "./EmptyState";
import { RadarList } from "./RadarList";
import { RadarMap } from "./RadarMap";
import { TrendUpIcon } from "./Icons";

interface RadarViewProps {
  items: RadarItem[];
  query: string;
  selectedId?: string;
  onOpenTech: (item: RadarItem) => void;
}

type ViewMode = "map" | "list";

export function RadarView({ items, query, selectedId, onOpenTech }: RadarViewProps) {
  const [view, setView] = useState<ViewMode>("map");
  const [rings, setRings] = useState<Set<Ring>>(new Set());
  const [quadrants, setQuadrants] = useState<Set<Quadrant>>(new Set());

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (rings.size > 0 && !rings.has(item.ring)) return false;
      if (quadrants.size > 0 && !quadrants.has(item.quadrant)) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle) ||
        item.tags.some((tag) => tag.includes(needle))
      );
    });
  }, [items, query, rings, quadrants]);

  const topSignals = useMemo(
    () => [...filtered].sort((a, b) => b.score - a.score).slice(0, 7),
    [filtered],
  );

  const hasFilters = rings.size > 0 || quadrants.size > 0 || Boolean(query.trim());

  const toggleRing = (ring: Ring) => {
    setRings((current) => {
      const next = new Set(current);
      if (next.has(ring)) next.delete(ring);
      else next.add(ring);
      return next;
    });
  };

  const toggleQuadrant = (quadrant: Quadrant) => {
    setQuadrants((current) => {
      const next = new Set(current);
      if (next.has(quadrant)) next.delete(quadrant);
      else next.add(quadrant);
      return next;
    });
  };

  return (
    <section className="radar-view" aria-label="Technology radar">
      <div className="radar-toolbar">
        <div className="segmented" role="group" aria-label="Radar view">
          <button
            type="button"
            className={view === "map" ? "is-active" : ""}
            onClick={() => setView("map")}
            aria-pressed={view === "map"}
          >
            Map
          </button>
          <button
            type="button"
            className={view === "list" ? "is-active" : ""}
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            List
          </button>
        </div>
        <span className="result-count">
          {filtered.length} technologies
          {hasFilters && (
            <button
              type="button"
              className="clear-filters"
              onClick={() => {
                setRings(new Set());
                setQuadrants(new Set());
              }}
            >
              Clear filters
            </button>
          )}
        </span>
      </div>

      <div className="filter-rows">
        <div className="chip-row" role="group" aria-label="Filter by ring">
          {RINGS.map((ring) => {
            const active = rings.has(ring);
            return (
              <button
                key={ring}
                type="button"
                className={`filter-chip ${active ? "is-active" : ""}`}
                style={{ "--chip": RING_META[ring].color } as React.CSSProperties}
                onClick={() => toggleRing(ring)}
                aria-pressed={active}
              >
                <span className="chip-dot" />
                {ring}
              </button>
            );
          })}
        </div>
        <div className="chip-row" role="group" aria-label="Filter by quadrant">
          {QUADRANTS.map((quadrant) => {
            const active = quadrants.has(quadrant);
            return (
              <button
                key={quadrant}
                type="button"
                className={`filter-chip ${active ? "is-active" : ""}`}
                style={{ "--chip": QUADRANT_META[quadrant].color } as React.CSSProperties}
                onClick={() => toggleQuadrant(quadrant)}
                aria-pressed={active}
              >
                <span className="chip-dot" />
                {QUADRANT_META[quadrant].short}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No technologies match">
          Adjust the filters or search for something else.
        </EmptyState>
      ) : (
        <div className="radar-layout">
          <div className="radar-main">
            {view === "map" ? (
              <RadarMap items={filtered} selectedId={selectedId} onSelect={onOpenTech} />
            ) : (
              <RadarList items={filtered} onSelect={onOpenTech} />
            )}
            <p className="radar-hint">
              Tap a dot to see the problem teams solved and how they used the technology.
            </p>
          </div>

          <aside className="radar-aside" aria-label="Top signals">
            <h2>
              <TrendUpIcon /> Top signals
            </h2>
            <ol>
              {topSignals.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => onOpenTech(item)}>
                    <span
                      className="tech-dot"
                      style={{ background: QUADRANT_META[item.quadrant]?.color ?? "#94a3b8" }}
                      aria-hidden="true"
                    />
                    <span className="signal-name">{item.name}</span>
                    <span className="signal-count">{item.articleCount}</span>
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </section>
  );
}
