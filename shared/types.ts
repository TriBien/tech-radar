export const QUADRANTS = [
  "Techniques",
  "Tools",
  "Platforms",
  "Languages & Frameworks",
] as const;

export const RINGS = ["Adopt", "Trial", "Assess", "Hold"] as const;

export type Quadrant = (typeof QUADRANTS)[number];
export type Ring = (typeof RINGS)[number];

export type SourceKind = "rss" | "hackernews" | "devto" | "reddit" | "github" | "reading";

export interface TechnologyMention {
  name: string;
  quadrant: Quadrant;
  ring: Ring;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  source: SourceKind;
  sourceName: string;
  author?: string;
  publishedAt: string;
  fetchedAt: string;
  summary: string;
  problem?: string;
  approach?: string;
  outcome?: string;
  technologies: TechnologyMention[];
  tags: string[];
  engagement: number;
  image?: string;
  lang?: string;
  enriched: boolean;
}

export interface RadarItem {
  id: string;
  name: string;
  quadrant: Quadrant;
  ring: Ring;
  description: string;
  articleCount: number;
  recentCount: number;
  previousCount: number;
  trend: "up" | "down" | "steady";
  firstSeen: string;
  lastSeen: string;
  articleIds: string[];
  tags: string[];
  score: number;
}

export interface RadarStats {
  articles: number;
  sources: number;
  technologies: number;
}

export interface RadarData {
  generatedAt: string;
  periodDays: number;
  items: RadarItem[];
  stats: RadarStats;
}

export interface SourceRun {
  name: string;
  kind: SourceKind;
  fetched: number;
  kept: number;
  error?: string;
}

export interface MetaData {
  lastRun: string;
  lastRunMs: number;
  llmUsed: boolean;
  newArticles: number;
  totalArticles: number;
  sources: SourceRun[];
}
