import type { Quadrant, Ring, TechnologyMention } from "../../shared/types.js";
import { stripHtml, truncate } from "./util.js";

interface TechDef {
  name: string;
  quadrant: Quadrant;
  ring: Ring;
  aliases: string[];
  /** Aliases that are too ambiguous for case-insensitive matching. */
  caseSensitive?: string[];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Seed dictionary used for (a) the no-LLM fallback and (b) validating /
 * normalising technology names returned by the LLM.
 */
export const TECH_DICTIONARY: TechDef[] = [
  // Languages & Frameworks
  { name: "TypeScript", quadrant: "Languages & Frameworks", ring: "Adopt", aliases: ["typescript"] },
  { name: "JavaScript", quadrant: "Languages & Frameworks", ring: "Adopt", aliases: ["javascript"] },
  { name: "Python", quadrant: "Languages & Frameworks", ring: "Adopt", aliases: ["python"] },
  { name: "Rust", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["rust"] },
  { name: "Go", quadrant: "Languages & Frameworks", ring: "Adopt", aliases: ["golang"], caseSensitive: ["Go"] },
  { name: "Java", quadrant: "Languages & Frameworks", ring: "Adopt", aliases: ["java"] },
  { name: "Kotlin", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["kotlin"] },
  { name: "Swift", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["swift"] },
  { name: "C++", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["c\\+\\+"] },
  { name: "C#", quadrant: "Languages & Frameworks", ring: "Adopt", aliases: ["c#", "csharp"] },
  { name: "Ruby", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["ruby"] },
  { name: "PHP", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["php"] },
  { name: "Elixir", quadrant: "Languages & Frameworks", ring: "Assess", aliases: ["elixir"] },
  { name: "Scala", quadrant: "Languages & Frameworks", ring: "Assess", aliases: ["scala"] },
  { name: "React", quadrant: "Languages & Frameworks", ring: "Adopt", aliases: ["react", "reactjs"] },
  { name: "Next.js", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["next\\.js", "nextjs"] },
  { name: "Vue", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["vue", "vuejs"] },
  { name: "Svelte", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["svelte", "sveltekit"] },
  { name: "Angular", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["angular"] },
  { name: "Node.js", quadrant: "Languages & Frameworks", ring: "Adopt", aliases: ["node\\.js", "nodejs"] },
  { name: "Deno", quadrant: "Languages & Frameworks", ring: "Assess", aliases: ["deno"] },
  { name: "Bun", quadrant: "Languages & Frameworks", ring: "Assess", aliases: ["bun"] },
  { name: "Django", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["django"] },
  { name: "FastAPI", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["fastapi"] },
  { name: "Flask", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["flask"] },
  { name: "Spring Boot", quadrant: "Languages & Frameworks", ring: "Adopt", aliases: ["spring boot", "springboot"] },
  { name: "Ruby on Rails", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["ruby on rails", "rails"] },
  { name: "Laravel", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["laravel"] },
  { name: ".NET", quadrant: "Languages & Frameworks", ring: "Adopt", aliases: ["\\.net", "dotnet", "asp\\.net"] },
  { name: "GraphQL", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["graphql"] },
  { name: "gRPC", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["grpc"] },
  { name: "WebAssembly", quadrant: "Languages & Frameworks", ring: "Assess", aliases: ["webassembly", "wasm"] },
  { name: "Tailwind CSS", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["tailwind"] },
  { name: "HTMX", quadrant: "Languages & Frameworks", ring: "Assess", aliases: ["htmx"] },
  { name: "Astro", quadrant: "Languages & Frameworks", ring: "Assess", aliases: ["astro"] },
  { name: "React Native", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["react native"] },
  { name: "Flutter", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["flutter"] },
  { name: "SwiftUI", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["swiftui"] },
  { name: "Jetpack Compose", quadrant: "Languages & Frameworks", ring: "Assess", aliases: ["jetpack compose"] },
  { name: "PyTorch", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["pytorch"] },
  { name: "TensorFlow", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["tensorflow"] },
  { name: "LangChain", quadrant: "Languages & Frameworks", ring: "Assess", aliases: ["langchain"] },
  { name: "Hugging Face", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["hugging face", "huggingface"] },
  { name: "Electron", quadrant: "Languages & Frameworks", ring: "Trial", aliases: ["electron"] },
  { name: "Tauri", quadrant: "Languages & Frameworks", ring: "Assess", aliases: ["tauri"] },

  // Tools
  { name: "Docker", quadrant: "Platforms", ring: "Adopt", aliases: ["docker"] },
  { name: "Kubernetes", quadrant: "Platforms", ring: "Adopt", aliases: ["kubernetes", "k8s"] },
  { name: "AWS", quadrant: "Platforms", ring: "Adopt", aliases: ["aws", "amazon web services"] },
  { name: "Google Cloud", quadrant: "Platforms", ring: "Adopt", aliases: ["google cloud", "gcp"] },
  { name: "Azure", quadrant: "Platforms", ring: "Trial", aliases: ["azure"] },
  { name: "Cloudflare", quadrant: "Platforms", ring: "Trial", aliases: ["cloudflare"] },
  { name: "Vercel", quadrant: "Platforms", ring: "Trial", aliases: ["vercel"] },
  { name: "Supabase", quadrant: "Platforms", ring: "Assess", aliases: ["supabase"] },
  { name: "Firebase", quadrant: "Platforms", ring: "Trial", aliases: ["firebase"] },
  { name: "Apache Kafka", quadrant: "Platforms", ring: "Trial", aliases: ["kafka"] },
  { name: "PostgreSQL", quadrant: "Platforms", ring: "Adopt", aliases: ["postgresql", "postgres"] },
  { name: "MySQL", quadrant: "Platforms", ring: "Trial", aliases: ["mysql"] },
  { name: "MongoDB", quadrant: "Platforms", ring: "Trial", aliases: ["mongodb", "mongo"] },
  { name: "Redis", quadrant: "Platforms", ring: "Adopt", aliases: ["redis"] },
  { name: "ClickHouse", quadrant: "Platforms", ring: "Assess", aliases: ["clickhouse"] },
  { name: "Snowflake", quadrant: "Platforms", ring: "Trial", aliases: ["snowflake"] },
  { name: "BigQuery", quadrant: "Platforms", ring: "Trial", aliases: ["bigquery"] },
  { name: "Elasticsearch", quadrant: "Platforms", ring: "Trial", aliases: ["elasticsearch"] },
  { name: "OpenSearch", quadrant: "Platforms", ring: "Assess", aliases: ["opensearch"] },
  { name: "Terraform", quadrant: "Tools", ring: "Adopt", aliases: ["terraform"] },
  { name: "Pulumi", quadrant: "Tools", ring: "Assess", aliases: ["pulumi"] },
  { name: "Ansible", quadrant: "Tools", ring: "Trial", aliases: ["ansible"] },
  { name: "Helm", quadrant: "Tools", ring: "Trial", aliases: ["helm"] },
  { name: "Argo CD", quadrant: "Tools", ring: "Trial", aliases: ["argo cd", "argocd"] },
  { name: "Flux", quadrant: "Tools", ring: "Assess", aliases: ["fluxcd", "flux cd"] },
  { name: "GitHub Actions", quadrant: "Tools", ring: "Adopt", aliases: ["github actions"] },
  { name: "GitLab CI", quadrant: "Tools", ring: "Trial", aliases: ["gitlab ci", "gitlab"] },
  { name: "Jenkins", quadrant: "Tools", ring: "Hold", aliases: ["jenkins"] },
  { name: "Prometheus", quadrant: "Tools", ring: "Adopt", aliases: ["prometheus"] },
  { name: "Grafana", quadrant: "Tools", ring: "Adopt", aliases: ["grafana"] },
  { name: "OpenTelemetry", quadrant: "Tools", ring: "Trial", aliases: ["opentelemetry", "otel"] },
  { name: "Datadog", quadrant: "Tools", ring: "Trial", aliases: ["datadog"] },
  { name: "Sentry", quadrant: "Tools", ring: "Trial", aliases: ["sentry"] },
  { name: "RabbitMQ", quadrant: "Tools", ring: "Trial", aliases: ["rabbitmq"] },
  { name: "NATS", quadrant: "Tools", ring: "Assess", aliases: ["nats"] },
  { name: "Vite", quadrant: "Tools", ring: "Trial", aliases: ["vite"] },
  { name: "Webpack", quadrant: "Tools", ring: "Hold", aliases: ["webpack"] },
  { name: "Nx", quadrant: "Tools", ring: "Assess", aliases: ["nx"] },
  { name: "Turborepo", quadrant: "Tools", ring: "Assess", aliases: ["turborepo", "turbo"] },
  { name: "Playwright", quadrant: "Tools", ring: "Trial", aliases: ["playwright"] },
  { name: "Cypress", quadrant: "Tools", ring: "Trial", aliases: ["cypress"] },
  { name: "Jest", quadrant: "Tools", ring: "Trial", aliases: ["jest"] },
  { name: "Vitest", quadrant: "Tools", ring: "Trial", aliases: ["vitest"] },
  { name: "Storybook", quadrant: "Tools", ring: "Trial", aliases: ["storybook"] },
  { name: "Figma", quadrant: "Tools", ring: "Adopt", aliases: ["figma"] },
  { name: "GitHub Copilot", quadrant: "Tools", ring: "Trial", aliases: ["github copilot", "copilot"] },
  { name: "Cursor", quadrant: "Tools", ring: "Assess", aliases: ["cursor"] },
  { name: "Claude Code", quadrant: "Tools", ring: "Assess", aliases: ["claude code"] },
  { name: "OpenAI API", quadrant: "Tools", ring: "Trial", aliases: ["openai", "gpt-4", "gpt-5"] },
  { name: "Anthropic Claude", quadrant: "Tools", ring: "Trial", aliases: ["anthropic", "claude"] },
  { name: "Gemini", quadrant: "Tools", ring: "Trial", aliases: ["gemini"] },
  { name: "Ollama", quadrant: "Tools", ring: "Assess", aliases: ["ollama"] },
  { name: "vLLM", quadrant: "Tools", ring: "Assess", aliases: ["vllm"] },
  { name: "pgvector", quadrant: "Tools", ring: "Assess", aliases: ["pgvector"] },
  { name: "Pinecone", quadrant: "Tools", ring: "Assess", aliases: ["pinecone"] },
  { name: "Qdrant", quadrant: "Tools", ring: "Assess", aliases: ["qdrant"] },
  { name: "Weaviate", quadrant: "Tools", ring: "Assess", aliases: ["weaviate"] },
  { name: "Vault", quadrant: "Tools", ring: "Trial", aliases: ["hashicorp vault", "vault"] },

  // Techniques
  { name: "Microservices", quadrant: "Techniques", ring: "Trial", aliases: ["microservice", "microservices"] },
  { name: "Event-driven architecture", quadrant: "Techniques", ring: "Trial", aliases: ["event-driven", "event driven"] },
  { name: "Event sourcing", quadrant: "Techniques", ring: "Assess", aliases: ["event sourcing"] },
  { name: "Domain-driven design", quadrant: "Techniques", ring: "Trial", aliases: ["domain-driven design", "ddd"] },
  { name: "CQRS", quadrant: "Techniques", ring: "Assess", aliases: ["cqrs"] },
  { name: "Platform engineering", quadrant: "Techniques", ring: "Trial", aliases: ["platform engineering"] },
  { name: "GitOps", quadrant: "Techniques", ring: "Trial", aliases: ["gitops"] },
  { name: "Infrastructure as Code", quadrant: "Techniques", ring: "Adopt", aliases: ["infrastructure as code", "iac"] },
  { name: "Observability", quadrant: "Techniques", ring: "Adopt", aliases: ["observability"] },
  { name: "Chaos engineering", quadrant: "Techniques", ring: "Assess", aliases: ["chaos engineering"] },
  { name: "SRE", quadrant: "Techniques", ring: "Trial", aliases: ["site reliability", "sre"] },
  { name: "Trunk-based development", quadrant: "Techniques", ring: "Trial", aliases: ["trunk-based", "trunk based"] },
  { name: "Continuous delivery", quadrant: "Techniques", ring: "Adopt", aliases: ["continuous delivery", "continuous deployment", "cd"] },
  { name: "Test-driven development", quadrant: "Techniques", ring: "Trial", aliases: ["test-driven", "tdd"] },
  { name: "Zero trust", quadrant: "Techniques", ring: "Trial", aliases: ["zero trust"] },
  { name: "RAG", quadrant: "Techniques", ring: "Trial", aliases: ["retrieval augmented generation", "retrieval-augmented", "rag"] },
  { name: "Prompt engineering", quadrant: "Techniques", ring: "Trial", aliases: ["prompt engineering"] },
  { name: "Fine-tuning", quadrant: "Techniques", ring: "Assess", aliases: ["fine-tuning", "fine tuning"] },
  { name: "AI agents", quadrant: "Techniques", ring: "Assess", aliases: ["ai agents", "agentic", "multi-agent"] },
  { name: "MLOps", quadrant: "Techniques", ring: "Assess", aliases: ["mlops", "llmops"] },
  { name: "FinOps", quadrant: "Techniques", ring: "Assess", aliases: ["finops"] },
  { name: "Data mesh", quadrant: "Techniques", ring: "Assess", aliases: ["data mesh"] },
  { name: "Feature flags", quadrant: "Techniques", ring: "Trial", aliases: ["feature flag", "feature flags"] },
  { name: "Blue-green deployment", quadrant: "Techniques", ring: "Trial", aliases: ["blue-green", "blue green"] },
  { name: "Canary releases", quadrant: "Techniques", ring: "Trial", aliases: ["canary"] },
  { name: "Edge computing", quadrant: "Techniques", ring: "Trial", aliases: ["edge computing"] },
  { name: "Serverless", quadrant: "Techniques", ring: "Trial", aliases: ["serverless"] },
  { name: "Monorepo", quadrant: "Techniques", ring: "Trial", aliases: ["monorepo"] },
  { name: "Design systems", quadrant: "Techniques", ring: "Trial", aliases: ["design system", "design systems"] },
  { name: "Accessibility", quadrant: "Techniques", ring: "Adopt", aliases: ["accessibility", "a11y"] },
  { name: "Micro frontends", quadrant: "Techniques", ring: "Assess", aliases: ["micro frontend", "micro-frontend"] },
  { name: "API-first", quadrant: "Techniques", ring: "Trial", aliases: ["api-first", "api first"] },
  { name: "Shift-left security", quadrant: "Techniques", ring: "Trial", aliases: ["shift-left", "shift left"] },
  { name: "DevEx", quadrant: "Techniques", ring: "Assess", aliases: ["developer experience", "devex"] },
];

interface CompiledTech {
  def: TechDef;
  patterns: RegExp[];
  casePatterns: RegExp[];
}

const COMPILED: CompiledTech[] = TECH_DICTIONARY.map((def) => ({
  def,
  patterns: def.aliases.map(
    (alias) => new RegExp(`(^|[^a-z0-9])${escapeRegex(alias)}([^a-z0-9]|$)`, "i"),
  ),
  casePatterns: (def.caseSensitive ?? []).map(
    (alias) => new RegExp(`(^|[^a-zA-Z0-9])${escapeRegex(alias)}([^a-zA-Z0-9]|$)`),
  ),
}));

const NAME_INDEX = new Map<string, TechDef>();
for (const def of TECH_DICTIONARY) {
  NAME_INDEX.set(def.name.toLowerCase(), def);
  for (const alias of def.aliases) {
    NAME_INDEX.set(alias.replace(/\\/g, "").toLowerCase(), def);
  }
}

export function normalizeTechName(raw: string): TechDef | undefined {
  const key = raw.trim().toLowerCase();
  return NAME_INDEX.get(key);
}

export function canonicalTech(
  raw: string,
  fallbackQuadrant: Quadrant = "Tools",
  fallbackRing: Ring = "Assess",
): TechnologyMention {
  const known = normalizeTechName(raw);
  if (known) {
    return { name: known.name, quadrant: known.quadrant, ring: known.ring };
  }
  return {
    name: raw.trim().replace(/\s+/g, " ").slice(0, 60),
    quadrant: fallbackQuadrant,
    ring: fallbackRing,
  };
}

export function extractTechnologies(text: string, limit = 6): TechnologyMention[] {
  const haystack = text.slice(0, 12_000);
  const found: { def: TechDef; hits: number }[] = [];

  for (const tech of COMPILED) {
    let hits = 0;
    for (const pattern of tech.patterns) {
      const matches = haystack.match(new RegExp(pattern.source, "gi"));
      hits += matches?.length ?? 0;
    }
    for (const pattern of tech.casePatterns) {
      const matches = haystack.match(new RegExp(pattern.source, "g"));
      hits += matches?.length ?? 0;
    }
    if (hits > 0) found.push({ def: tech.def, hits });
  }

  found.sort((a, b) => b.hits - a.hits || a.def.name.localeCompare(b.def.name));
  return found.slice(0, limit).map(({ def }) => ({
    name: def.name,
    quadrant: def.quadrant,
    ring: def.ring,
  }));
}

const TAG_RULES: { tag: string; aliases: string[] }[] = [
  { tag: "ai", aliases: [" ai ", "artificial intelligence", "machine learning", "llm", "genai", "generative"] },
  { tag: "llm", aliases: ["llm", "large language model", "gpt", "claude", "gemini"] },
  { tag: "security", aliases: ["security", "vulnerability", "encryption", "auth", "zero trust", "supply chain"] },
  { tag: "observability", aliases: ["observability", "tracing", "metrics", "logging", "monitoring", "telemetry"] },
  { tag: "database", aliases: ["database", "postgres", "mysql", "sql", "storage", "query"] },
  { tag: "frontend", aliases: ["frontend", "front-end", "react", "css", "browser", "web performance"] },
  { tag: "backend", aliases: ["backend", "back-end", "api", "server", "service"] },
  { tag: "cloud", aliases: ["cloud", "aws", "gcp", "azure", "serverless"] },
  { tag: "kubernetes", aliases: ["kubernetes", "k8s", "container", "helm"] },
  { tag: "devops", aliases: ["devops", "ci/cd", "pipeline", "deployment", "gitops"] },
  { tag: "performance", aliases: ["performance", "latency", "throughput", "scalability", "cache"] },
  { tag: "architecture", aliases: ["architecture", "microservice", "monolith", "system design"] },
  { tag: "data", aliases: ["data engineering", "pipeline", "etl", "analytics", "warehouse", "streaming"] },
  { tag: "mobile", aliases: ["mobile", "ios", "android", "react native", "flutter"] },
  { tag: "testing", aliases: ["testing", "test", "quality assurance", "e2e"] },
  { tag: "messaging", aliases: ["messaging", "queue", "kafka", "event-driven", "pub/sub"] },
  { tag: "edge", aliases: ["edge", "cdn", "distributed", "global"] },
];

export function inferTags(text: string, limit = 5): string[] {
  const lower = ` ${text.toLowerCase()} `;
  const tags = TAG_RULES.filter((rule) => rule.aliases.some((alias) => lower.includes(alias))).map(
    (rule) => rule.tag,
  );
  return tags.slice(0, limit);
}

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+/g) ?? [text])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function pickSentence(
  sentences: string[],
  keywords: string[],
  used: Set<string>,
  minLength = 40,
  maxLength = 280,
): string | undefined {
  for (const sentence of sentences) {
    if (used.has(sentence)) continue;
    if (sentence.length < minLength || sentence.length > maxLength) continue;
    const lower = sentence.toLowerCase();
    if (keywords.some((keyword) => lower.includes(keyword))) {
      used.add(sentence);
      return sentence;
    }
  }
  return undefined;
}

const PROBLEM_KEYWORDS = [
  "problem", "challenge", "we needed", "we had to", "struggl", "bottleneck",
  "pain point", "issue", "required us", "faced", "difficult", "hard to",
];
const APPROACH_KEYWORDS = [
  "we built", "we implemented", "we migrated", "we adopted", "we used", "we introduced",
  "we designed", "we switched", "we leveraged", "built a", "implemented", "using a",
  "designed a", "introduced", "migrated to",
];
const OUTCOME_KEYWORDS = [
  "reduced", "improved", "increased", "cut ", "saved", "faster", "latency",
  "cost", "resulted in", "achieved", "dropped", "decreased", "boosted", "enabled us",
];

/** Best-effort offline enrichment used when no LLM is available. */
export function heuristicEnrich(title: string, excerpt: string): {
  summary: string;
  problem?: string;
  approach?: string;
  outcome?: string;
  technologies: TechnologyMention[];
  tags: string[];
} {
  const clean = stripHtml(excerpt);
  const summary = truncate(clean || title, 240);
  const text = `${title}. ${clean}`;
  const sentences = splitSentences(clean);
  const used = new Set<string>();

  return {
    summary,
    problem: pickSentence(sentences, PROBLEM_KEYWORDS, used),
    approach: pickSentence(sentences, APPROACH_KEYWORDS, used),
    outcome: pickSentence(sentences, OUTCOME_KEYWORDS, used),
    technologies: extractTechnologies(text, 5),
    tags: inferTags(text, 4),
  };
}
