export const SYSTEM_DESIGN_TOPICS = [
  "architecture",
  "scalability",
  "distributed-systems",
  "data-storage",
  "caching",
  "messaging",
  "reliability",
  "security",
  "observability",
  "api-design",
  "cloud-infrastructure",
] as const;

export type SystemDesignTopic = (typeof SYSTEM_DESIGN_TOPICS)[number];

export interface SystemDesignInput {
  title?: string;
  summary?: string;
  problem?: string;
  approach?: string;
  outcome?: string;
  tags?: string[];
  technologies?: { name: string }[];
  topics?: string[];
}

export interface SystemDesignMatch {
  isSystemDesign: boolean;
  topics: SystemDesignTopic[];
  score: number;
}

interface TopicMeta {
  label: string;
  description: string;
  color: string;
  keywords: string[];
}

export const SYSTEM_DESIGN_TOPIC_META: Record<SystemDesignTopic, TopicMeta> = {
  architecture: {
    label: "Architecture",
    description: "System decomposition, boundaries and design patterns",
    color: "#0ea5e9",
    keywords: [
      "system design",
      "software architecture",
      "architecture",
      "architectural",
      "monolith",
      "modular monolith",
      "microservice",
      "microservices",
      "domain-driven design",
      "domain driven design",
      "cqrs",
      "event sourcing",
      "hexagonal architecture",
      "clean architecture",
      "layered architecture",
      "design pattern",
      "architecture decision",
      "service mesh",
      "api gateway",
      "backend for frontend",
    ],
  },
  scalability: {
    label: "Scalability",
    description: "Handling growth, load and performance limits",
    color: "#f59e0b",
    keywords: [
      "scalability",
      "scalable",
      "high availability",
      "horizontal scaling",
      "vertical scaling",
      "scale out",
      "scale up",
      "load balancing",
      "load balancer",
      "capacity planning",
      "throughput",
      "latency",
      "bottleneck",
      "rate limiting",
      "backpressure",
      "sharding",
      "hot partition",
    ],
  },
  "distributed-systems": {
    label: "Distributed systems",
    description: "Consensus, replication and coordination across nodes",
    color: "#8b5cf6",
    keywords: [
      "distributed system",
      "distributed systems",
      "distributed architecture",
      "consensus",
      "raft",
      "paxos",
      "replication",
      "partition tolerance",
      "cap theorem",
      "eventual consistency",
      "strong consistency",
      "leader election",
      "fault tolerance",
      "fault-tolerant",
      "cluster",
      "gossip protocol",
      "crdt",
      "two-phase commit",
      "saga pattern",
    ],
  },
  "data-storage": {
    label: "Data & storage",
    description: "Databases, schemas and data pipelines",
    color: "#10b981",
    keywords: [
      "database design",
      "database architecture",
      "database internals",
      "distributed database",
      "database scaling",
      "database sharding",
      "data store",
      "datastore",
      "storage layer",
      "storage architecture",
      "nosql",
      "relational database",
      "document database",
      "key-value store",
      "indexing",
      "data modeling",
      "schema design",
      "data lake",
      "data warehouse",
      "etl",
      "data pipeline",
      "streaming pipeline",
    ],
  },
  caching: {
    label: "Caching",
    description: "Caching layers, invalidation and edge delivery",
    color: "#ef4444",
    keywords: [
      "cache",
      "caching",
      "redis",
      "memcached",
      "cdn",
      "content delivery network",
      "cache invalidation",
      "ttl",
      "edge caching",
      "write-through",
      "read-through",
      "cache stampede",
    ],
  },
  messaging: {
    label: "Messaging",
    description: "Queues, events and streaming between services",
    color: "#ec4899",
    keywords: [
      "message queue",
      "message broker",
      "kafka",
      "rabbitmq",
      "nats",
      "pub/sub",
      "publish-subscribe",
      "event-driven",
      "event driven",
      "event streaming",
      "stream processing",
      "dead letter",
      "webhook",
      "idempotency",
      "idempotent",
    ],
  },
  reliability: {
    label: "Reliability",
    description: "Resilience, failure handling and incident response",
    color: "#22c55e",
    keywords: [
      "reliability",
      "resilience",
      "resilient",
      "failover",
      "disaster recovery",
      "circuit breaker",
      "retry",
      "timeout",
      "graceful degradation",
      "chaos engineering",
      "site reliability",
      "sre",
      "sla",
      "slo",
      "sli",
      "incident",
      "outage",
      "postmortem",
      "post-mortem",
    ],
  },
  security: {
    label: "Security",
    description: "Identity, access and secure system boundaries",
    color: "#64748b",
    keywords: [
      "security architecture",
      "authentication",
      "authorization",
      "oauth",
      "openid",
      "zero trust",
      "encryption",
      "tls",
      "secrets management",
      "access control",
      "identity management",
      "iam",
      "threat model",
      "supply chain security",
      "mtls",
    ],
  },
  observability: {
    label: "Observability",
    description: "Metrics, tracing and logs for running systems",
    color: "#06b6d4",
    keywords: [
      "observability",
      "monitoring",
      "distributed tracing",
      "tracing",
      "metrics",
      "logging",
      "telemetry",
      "telemetry pipeline",
    ],
  },
  "api-design": {
    label: "API design",
    description: "Contracts, protocols and integration boundaries",
    color: "#6366f1",
    keywords: [
      "api design",
      "rest api",
      "graphql",
      "grpc",
      "restful",
      "api versioning",
      "pagination",
      "contract testing",
      "openapi",
      "bff",
      "backend for frontend",
      "idempotency key",
    ],
  },
  "cloud-infrastructure": {
    label: "Cloud & infrastructure",
    description: "Platforms, deployment and runtime foundations",
    color: "#14b8a6",
    keywords: [
      "cloud architecture",
      "kubernetes architecture",
      "container orchestration",
      "serverless architecture",
      "infrastructure as code",
      "platform engineering",
      "service mesh",
      "multi-cloud",
      "hybrid cloud",
      "edge computing",
      "distributed infrastructure",
    ],
  },
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const COMPILED: { id: SystemDesignTopic; patterns: RegExp[] }[] = SYSTEM_DESIGN_TOPICS.map(
  (id) => ({
    id,
    patterns: SYSTEM_DESIGN_TOPIC_META[id].keywords.map(
      (keyword) => new RegExp(`(^|[^a-z0-9])${escapeRegex(keyword)}([^a-z0-9]|$)`, "i"),
    ),
  }),
);

function normalize(value: string | undefined): string {
  return (value ?? "").toLowerCase().trim();
}

function matchesAny(patterns: RegExp[], value: string): boolean {
  return value.length > 0 && patterns.some((pattern) => pattern.test(value));
}

export function classifySystemDesign(input: SystemDesignInput): SystemDesignMatch {
  const title = normalize(input.title);
  const body = normalize(
    [input.summary, input.problem, input.approach, input.outcome].filter(Boolean).join(" "),
  );
  const tags = (input.tags ?? []).map(normalize).filter(Boolean);
  const technologies = (input.technologies ?? []).map((tech) => normalize(tech.name)).filter(Boolean);

  const scores = new Map<SystemDesignTopic, number>();
  let hasStrongSignal = false;
  let total = 0;

  for (const { id, patterns } of COMPILED) {
    let score = 0;

    if (matchesAny(patterns, title)) {
      score += 3;
      hasStrongSignal = true;
    }
    if (matchesAny(patterns, body)) score += 1;
    if (tags.some((tag) => matchesAny(patterns, tag))) {
      score += 2.5;
      hasStrongSignal = true;
    }
    if (technologies.some((technology) => matchesAny(patterns, technology))) {
      score += 2.5;
    }

    if (score > 0) {
      scores.set(id, score);
      total += score;
    }
  }

  const ranked = [...scores.entries()]
    .filter(([, score]) => score >= 1.5)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const hasCoreTopic = ranked.some(
    (id) => id !== "security" && id !== "observability",
  );
  const hasTopicDepth = ranked.length >= 2 && total >= 4;
  const isSystemDesign = hasCoreTopic && ((hasStrongSignal && total >= 3) || hasTopicDepth);

  return {
    isSystemDesign,
    topics: isSystemDesign ? ranked.slice(0, 5) : [],
    score: Math.round(total * 10) / 10,
  };
}
