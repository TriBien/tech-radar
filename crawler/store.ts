import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Article, MetaData, RadarData } from "../shared/types.js";
import { MAX_ARTICLES, retentionDays } from "./config.js";
import { daysAgo } from "./lib/util.js";

export const DATA_DIR = path.resolve(process.cwd(), "public/data");
const ARTICLES_FILE = path.join(DATA_DIR, "articles.json");
const RADAR_FILE = path.join(DATA_DIR, "radar.json");
const META_FILE = path.join(DATA_DIR, "meta.json");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadArticles(): Promise<Article[]> {
  const data = await readJson<unknown>(ARTICLES_FILE, []);
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is Article =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as Article).id === "string" &&
      typeof (item as Article).url === "string" &&
      typeof (item as Article).title === "string",
  );
}

export async function loadMeta(): Promise<MetaData | undefined> {
  return readJson<MetaData | undefined>(META_FILE, undefined);
}

export function pruneArticles(articles: Article[]): Article[] {
  const cutoff = daysAgo(retentionDays()).getTime();
  const fresh = articles.filter((article) => {
    const ts = new Date(article.publishedAt).getTime();
    return !Number.isFinite(ts) || ts >= cutoff;
  });

  return fresh
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, MAX_ARTICLES);
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function saveData(
  articles: Article[],
  radar: RadarData,
  meta: MetaData,
): Promise<Article[]> {
  await mkdir(DATA_DIR, { recursive: true });
  const pruned = pruneArticles(articles);
  await Promise.all([
    writeJson(ARTICLES_FILE, pruned),
    writeJson(RADAR_FILE, radar),
    writeJson(META_FILE, meta),
  ]);
  return pruned;
}
