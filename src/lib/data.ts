import type { Article, MetaData, RadarData } from "../../shared/types";

const base = import.meta.env.BASE_URL || "/";

async function loadJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${base}data/${path}`, { cache: "no-cache" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export interface AppData {
  articles: Article[];
  radar: RadarData;
  meta: MetaData | null;
}

const emptyRadar: RadarData = {
  generatedAt: "",
  periodDays: 60,
  items: [],
  stats: { articles: 0, sources: 0, technologies: 0 },
};

export async function loadAppData(): Promise<AppData> {
  const [articles, radar, meta] = await Promise.all([
    loadJson<Article[]>("articles.json", []),
    loadJson<RadarData>("radar.json", emptyRadar),
    loadJson<MetaData | null>("meta.json", null),
  ]);
  return {
    articles: Array.isArray(articles) ? articles : [],
    radar: radar && Array.isArray(radar.items) ? radar : emptyRadar,
    meta: meta ?? null,
  };
}
