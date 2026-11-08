import type { Article, Quadrant, Ring, TechnologyMention } from "../../shared/types.js";
import { QUADRANTS, RINGS } from "../../shared/types.js";
import { postJson } from "./http.js";
import {
  canonicalTech,
  extractTechnologies,
  inferTags,
  normalizeTechName,
} from "./heuristics.js";
import { mapLimit, stripHtml, truncate } from "./util.js";

const BASE_URL = (process.env.LLM_BASE_URL || "https://models.github.ai/inference").replace(/\/$/, "");
const MODEL = process.env.LLM_MODEL || "openai/gpt-4o-mini";
const API_KEY = process.env.LLM_API_KEY || process.env.GITHUB_TOKEN || "";

const BATCH_SIZE = 5;
const MAX_EXCERPT = 1100;

export function llmAvailable(): boolean {
  return Boolean(API_KEY);
}

export interface Enrichment {
  summary: string;
  problem?: string;
  approach?: string;
  outcome?: string;
  technologies: TechnologyMention[];
  tags: string[];
}

interface LlmArticle {
  id?: string;
  summary?: string;
  problem?: string;
  approach?: string;
  outcome?: string;
  technologies?: { name?: string; quadrant?: string; ring?: string }[];
  tags?: string[];
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
}

const SYSTEM_PROMPT = `You are an analyst building a technology radar for solution architects.
For each engineering article, extract:
- summary: 2-3 crisp sentences on what was done and the result.
- problem: the concrete real-world problem the team faced (1 sentence).
- approach: how they used the technology to solve it (1-2 sentences).
- outcome: the measurable/qualitative result (1 sentence). Use "Not stated" if absent.
- technologies: 1-5 specific technologies central to the work.
- tags: 2-4 lowercase topical tags.

For each technology choose a quadrant from exactly: ${QUADRANTS.join(", ")}.
Choose a ring from exactly: ${RINGS.join(", ")}. Rings mean:
Adopt = proven, use with confidence; Trial = worth pursuing in low-risk projects;
Assess = worth exploring/keeping an eye on; Hold = avoid for new work.

Only use facts supported by the provided text. Do not invent metrics.
Respond with JSON only, matching:
{"articles":[{"id":"...","summary":"...","problem":"...","approach":"...","outcome":"...","technologies":[{"name":"...","quadrant":"...","ring":"..."}],"tags":["..."]}]}`;

function buildUserPrompt(articles: Article[]): string {
  const items = articles.map((article) => ({
    id: article.id,
    title: article.title,
    source: article.sourceName,
    url: article.url,
    excerpt: truncate(stripHtml(article.summary), MAX_EXCERPT),
  }));
  return `Analyse these ${items.length} article(s):\n${JSON.stringify(items, null, 2)}`;
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in LLM response");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function asQuadrant(value: string | undefined): Quadrant | undefined {
  if (!value) return undefined;
  return QUADRANTS.find((q) => q.toLowerCase() === value.trim().toLowerCase());
}

function asRing(value: string | undefined): Ring | undefined {
  if (!value) return undefined;
  return RINGS.find((r) => r.toLowerCase() === value.trim().toLowerCase());
}

function normaliseTechnologies(
  raw: LlmArticle["technologies"],
  fallbackText: string,
): TechnologyMention[] {
  const result = new Map<string, TechnologyMention>();

  for (const item of raw ?? []) {
    if (!item?.name) continue;
    const known = normalizeTechName(item.name);
    const quadrant = asQuadrant(item.quadrant) ?? known?.quadrant ?? "Tools";
    const ring = asRing(item.ring) ?? known?.ring ?? "Assess";
    const tech = canonicalTech(item.name, quadrant, ring);
    if (!tech.name) continue;
    result.set(tech.name.toLowerCase(), {
      name: tech.name,
      quadrant: known?.quadrant ?? quadrant,
      ring,
    });
  }

  for (const tech of extractTechnologies(fallbackText, 5)) {
    if (!result.has(tech.name.toLowerCase())) {
      result.set(tech.name.toLowerCase(), tech);
    }
  }

  return [...result.values()].slice(0, 6);
}

function cleanText(value: string | undefined, max: number): string | undefined {
  if (!value || typeof value !== "string") return undefined;
  const text = stripHtml(value).trim();
  if (!text || text.toLowerCase() === "not stated") return undefined;
  return truncate(text, max);
}

function toEnrichment(raw: LlmArticle, article: Article): Enrichment {
  const fallbackText = `${article.title}. ${stripHtml(article.summary)}`;
  const summary =
    cleanText(raw.summary, 500) ||
    truncate(stripHtml(article.summary) || article.title, 300);
  const tags = Array.isArray(raw.tags)
    ? raw.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.toLowerCase().trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];

  return {
    summary,
    problem: cleanText(raw.problem, 320),
    approach: cleanText(raw.approach, 380),
    outcome: cleanText(raw.outcome, 280),
    technologies: normaliseTechnologies(raw.technologies, fallbackText),
    tags: tags.length ? tags : inferTags(fallbackText, 4),
  };
}

async function requestBatch(articles: Article[]): Promise<Map<string, Enrichment>> {
  const body = {
    model: MODEL,
    temperature: 0.2,
    max_tokens: 3000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(articles) },
    ],
  };

  const response = await postJson<ChatResponse>(`${BASE_URL}/chat/completions`, body, {
    timeoutMs: 90_000,
    retries: 1,
    headers: { authorization: `Bearer ${API_KEY}` },
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content || content.trim() === "OK") {
    throw new Error("LLM returned no usable content");
  }

  const parsed = extractJson(content) as { articles?: LlmArticle[] };
  const list = Array.isArray(parsed.articles) ? parsed.articles : [];
  const byId = new Map(articles.map((article) => [article.id, article]));
  const result = new Map<string, Enrichment>();

  for (let index = 0; index < list.length; index++) {
    const raw = list[index];
    const article = (raw.id ? byId.get(raw.id) : undefined) ?? articles[index];
    if (!article) continue;
    result.set(article.id, toEnrichment(raw, article));
  }

  return result;
}

/**
 * Enrich articles with an OpenAI-compatible chat model. Returns only the
 * articles that were successfully processed; callers should fall back to
 * heuristics for the rest.
 */
export async function enrichWithLlm(articles: Article[]): Promise<Map<string, Enrichment>> {
  if (!llmAvailable() || articles.length === 0) return new Map();

  const batches: Article[][] = [];
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    batches.push(articles.slice(i, i + BATCH_SIZE));
  }

  const results = await mapLimit(batches, 2, async (batch) => {
    try {
      return await requestBatch(batch);
    } catch (error) {
      console.warn(`  ! LLM batch failed: ${(error as Error).message}`);
      return new Map<string, Enrichment>();
    }
  });

  const merged = new Map<string, Enrichment>();
  for (const map of results) {
    for (const [id, value] of map) merged.set(id, value);
  }
  return merged;
}
