import { useMemo } from "react";
import type { Quadrant, RadarItem } from "../../shared/types";
import {
  RADAR_CENTER,
  RADAR_MAX_RADIUS,
  RADAR_SIZE,
  QUADRANT_META,
  RING_META,
  layoutRadar,
} from "../lib/radar";

interface RadarMapProps {
  items: RadarItem[];
  selectedId?: string;
  onSelect: (item: RadarItem) => void;
}

const QUADRANT_ORDER: Quadrant[] = [
  "Techniques",
  "Tools",
  "Platforms",
  "Languages & Frameworks",
];

const ANGLE_RANGES: Record<Quadrant, [number, number]> = {
  Tools: [-Math.PI / 2, 0],
  Platforms: [0, Math.PI / 2],
  "Languages & Frameworks": [Math.PI / 2, Math.PI],
  Techniques: [Math.PI, (3 * Math.PI) / 2],
};

function sectorPath(start: number, end: number, radius: number): string {
  const x1 = RADAR_CENTER + Math.cos(start) * radius;
  const y1 = RADAR_CENTER + Math.sin(start) * radius;
  const x2 = RADAR_CENTER + Math.cos(end) * radius;
  const y2 = RADAR_CENTER + Math.sin(end) * radius;
  return [
    `M ${RADAR_CENTER} ${RADAR_CENTER}`,
    `L ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${radius} ${radius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export function RadarMap({ items, selectedId, onSelect }: RadarMapProps) {
  const placed = useMemo(() => layoutRadar(items), [items]);

  const labelled = useMemo(() => {
    const top = [...placed].sort((a, b) => b.item.score - a.item.score).slice(0, 8);
    const ids = new Set(top.map((entry) => entry.item.id));
    if (selectedId) ids.add(selectedId);
    return ids;
  }, [placed, selectedId]);

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <div className="radar-map">
      <svg
        viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
        role="group"
        aria-label={`Technology radar with ${items.length} technologies. Tap a dot for details.`}
      >
        <circle
          cx={RADAR_CENTER}
          cy={RADAR_CENTER}
          r={RADAR_MAX_RADIUS}
          className="radar-disc"
        />

        {QUADRANT_ORDER.map((quadrant) => {
          const [start, end] = ANGLE_RANGES[quadrant];
          return (
            <path
              key={quadrant}
              d={sectorPath(start, end, RADAR_MAX_RADIUS)}
              style={{ fill: QUADRANT_META[quadrant].color }}
              className="radar-quadrant"
            />
          );
        })}

        {rings.map((ratio) => (
          <circle
            key={ratio}
            cx={RADAR_CENTER}
            cy={RADAR_CENTER}
            r={RADAR_MAX_RADIUS * ratio}
            className="radar-ring"
          />
        ))}

        <line
          x1={RADAR_CENTER - RADAR_MAX_RADIUS * 0.707}
          y1={RADAR_CENTER - RADAR_MAX_RADIUS * 0.707}
          x2={RADAR_CENTER + RADAR_MAX_RADIUS * 0.707}
          y2={RADAR_CENTER + RADAR_MAX_RADIUS * 0.707}
          className="radar-axis"
        />
        <line
          x1={RADAR_CENTER - RADAR_MAX_RADIUS * 0.707}
          y1={RADAR_CENTER + RADAR_MAX_RADIUS * 0.707}
          x2={RADAR_CENTER + RADAR_MAX_RADIUS * 0.707}
          y2={RADAR_CENTER - RADAR_MAX_RADIUS * 0.707}
          className="radar-axis"
        />

        {QUADRANT_ORDER.map((quadrant) => {
          const [start, end] = ANGLE_RANGES[quadrant];
          const mid = (start + end) / 2;
          const radius = RADAR_MAX_RADIUS * 0.9;
          const x = RADAR_CENTER + Math.cos(mid) * radius;
          const y = RADAR_CENTER + Math.sin(mid) * radius;
          const anchor = Math.cos(mid) > 0.3 ? "start" : Math.cos(mid) < -0.3 ? "end" : "middle";
          return (
            <text
              key={quadrant}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="radar-quadrant-label"
              style={{ fill: QUADRANT_META[quadrant].color }}
            >
              {QUADRANT_META[quadrant].short}
            </text>
          );
        })}

        {(["Adopt", "Trial", "Assess", "Hold"] as const).map((ring, index) => {
          const mid = RADAR_MAX_RADIUS * ((index * 0.25 + (index + 1) * 0.25) / 2);
          return (
            <text
              key={ring}
              x={RADAR_CENTER + mid}
              y={RADAR_CENTER - 9}
              textAnchor="middle"
              className="radar-ring-label"
              style={{ fill: RING_META[ring].color }}
            >
              {ring}
            </text>
          );
        })}

        <circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={3} className="radar-center" />

        {placed.map(({ item, x, y, dotRadius }) => {
          const color = QUADRANT_META[item.quadrant]?.color ?? "#94a3b8";
          const selected = item.id === selectedId;

          return (
            <g
              key={item.id}
              className={`radar-dot ${selected ? "is-selected" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`${item.name}: ${item.ring}, ${item.quadrant}, ${item.articleCount} stories`}
              onClick={() => onSelect(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(item);
                }
              }}
            >
              <title>
                {item.name} — {item.ring} · {item.articleCount} stories
              </title>
              <circle cx={x} cy={y} r={dotRadius + 10} fill="transparent" />
              {selected && (
                <circle
                  cx={x}
                  cy={y}
                  r={dotRadius + 5}
                  fill="none"
                  style={{ stroke: color }}
                  strokeWidth="1.5"
                  opacity="0.55"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={dotRadius}
                className="radar-dot-core"
                style={{ fill: color }}
              />
            </g>
          );
        })}

        {placed
          .filter(({ item }) => labelled.has(item.id))
          .map(({ item, x, y, dotRadius }) => {
            const anchor = x < RADAR_CENTER ? "end" : "start";
            const labelX = x < RADAR_CENTER ? x - dotRadius - 6 : x + dotRadius + 6;
            const label = item.name.length > 22 ? `${item.name.slice(0, 21)}…` : item.name;
            return (
              <text
                key={`label-${item.id}`}
                x={labelX}
                y={y + 3.5}
                textAnchor={anchor}
                className={`radar-dot-label ${item.id === selectedId ? "is-selected" : ""}`}
              >
                {label}
              </text>
            );
          })}
      </svg>
    </div>
  );
}
