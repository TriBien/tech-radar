import type { Quadrant, RadarItem, Ring, SourceKind } from "../../shared/types";
import { hashString, mulberry32 } from "./format";

export const RADAR_SIZE = 720;
export const RADAR_CENTER = RADAR_SIZE / 2;
export const RADAR_MAX_RADIUS = 292;

export const QUADRANT_META: Record<
  Quadrant,
  { color: string; short: string; description: string }
> = {
  Techniques: {
    color: "var(--quad-techniques)",
    short: "Techniques",
    description: "Practices and ways of working",
  },
  Tools: {
    color: "var(--quad-tools)",
    short: "Tools",
    description: "Software that helps teams build and operate",
  },
  Platforms: {
    color: "var(--quad-platforms)",
    short: "Platforms",
    description: "Infrastructure and services you build on",
  },
  "Languages & Frameworks": {
    color: "var(--quad-languages)",
    short: "Languages",
    description: "Languages, frameworks and libraries",
  },
};

export const RING_META: Record<Ring, { color: string; description: string }> = {
  Adopt: { color: "var(--ring-adopt)", description: "Proven — use with confidence" },
  Trial: { color: "var(--ring-trial)", description: "Worth pursuing in real projects" },
  Assess: { color: "var(--ring-assess)", description: "Explore and keep on your radar" },
  Hold: { color: "var(--ring-hold)", description: "Avoid for new work" },
};

export const SOURCE_META: Record<SourceKind, { label: string; className: string }> = {
  rss: { label: "Engineering blog", className: "src-rss" },
  hackernews: { label: "Hacker News", className: "src-hn" },
  devto: { label: "DEV", className: "src-devto" },
  reddit: { label: "Reddit", className: "src-reddit" },
  github: { label: "GitHub", className: "src-github" },
  reading: { label: "Reading list", className: "src-reading" },
};

// Screen angles (radians, y grows downwards).
const QUADRANT_ANGLES: Record<Quadrant, [number, number]> = {
  Tools: [-Math.PI / 2, 0],
  Platforms: [0, Math.PI / 2],
  "Languages & Frameworks": [Math.PI / 2, Math.PI],
  Techniques: [Math.PI, (3 * Math.PI) / 2],
};

const RING_BOUNDS = [0, 0.25, 0.5, 0.75, 1];
const RING_ORDER: Ring[] = ["Adopt", "Trial", "Assess", "Hold"];

export interface PlacedItem {
  item: RadarItem;
  x: number;
  y: number;
  dotRadius: number;
}

export function dotRadius(item: RadarItem): number {
  return 7 + Math.min(8, Math.sqrt(item.articleCount) * 2.4);
}

export function layoutRadar(items: RadarItem[]): PlacedItem[] {
  const placed: PlacedItem[] = [];
  const sorted = [...items].sort((a, b) => b.score - a.score);

  for (const item of sorted) {
    const ringIndex = RING_ORDER.indexOf(item.ring);
    const inner = RING_BOUNDS[ringIndex] * RADAR_MAX_RADIUS;
    const outer = RING_BOUNDS[ringIndex + 1] * RADAR_MAX_RADIUS;
    const [start, end] = QUADRANT_ANGLES[item.quadrant];
    const span = end - start;
    const rng = mulberry32(hashString(item.id));
    const size = dotRadius(item);

    let best = { x: 0, y: 0, minDist: Number.NEGATIVE_INFINITY };

    for (let attempt = 0; attempt < 24; attempt++) {
      const angle = start + (0.14 + rng() * 0.72) * span;
      const radius = inner + (outer - inner) * (0.24 + rng() * 0.54);
      const x = RADAR_CENTER + Math.cos(angle) * radius;
      const y = RADAR_CENTER + Math.sin(angle) * radius;

      let minDist = Number.POSITIVE_INFINITY;
      for (const other of placed) {
        const dx = x - other.x;
        const dy = y - other.y;
        const dist = Math.hypot(dx, dy) - (size + other.dotRadius) - 5;
        if (dist < minDist) minDist = dist;
      }

      if (minDist > best.minDist) best = { x, y, minDist };
      if (minDist > 3) break;
    }

    placed.push({ item, x: best.x, y: best.y, dotRadius: size });
  }

  return placed;
}
