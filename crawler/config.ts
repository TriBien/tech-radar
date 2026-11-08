export interface FeedConfig {
  name: string;
  url: string;
  tags?: string[];
}

/** Curated engineering blogs. Add or remove freely. */
export const FEEDS: FeedConfig[] = [
  { name: "Netflix Tech Blog", url: "https://netflixtechblog.com/feed", tags: ["scale", "streaming"] },
  { name: "Cloudflare Blog", url: "https://blog.cloudflare.com/rss/", tags: ["infra", "security"] },
  { name: "Martin Fowler", url: "https://martinfowler.com/feed.atom", tags: ["architecture"] },
  { name: "GitHub Blog", url: "https://github.blog/feed/", tags: ["devtools"] },
  { name: "Meta Engineering", url: "https://engineering.fb.com/feed/", tags: ["scale"] },
  { name: "Spotify Engineering", url: "https://engineering.atspotify.com/feed/", tags: ["platform"] },
  { name: "Slack Engineering", url: "https://slack.engineering/feed/", tags: ["platform"] },
  { name: "Shopify Engineering", url: "https://shopify.engineering/blog.atom", tags: ["commerce"] },
  { name: "Stripe Engineering", url: "https://stripe.com/blog/feed.rss", tags: ["payments"] },
  { name: "AWS Architecture Blog", url: "https://aws.amazon.com/blogs/architecture/feed/", tags: ["cloud"] },
  { name: "Google Cloud Blog", url: "https://cloudblog.withgoogle.com/rss/", tags: ["cloud"] },
  { name: "Microsoft DevBlogs", url: "https://devblogs.microsoft.com/feed/", tags: ["dotnet", "cloud"] },
  { name: "The New Stack", url: "https://thenewstack.io/feed/", tags: ["cloud-native"] },
  { name: "InfoQ", url: "https://feed.infoq.com/", tags: ["architecture"] },
  { name: "Simon Willison", url: "https://simonwillison.net/atom/everything/", tags: ["ai", "python"] },
  { name: "Kubernetes Blog", url: "https://kubernetes.io/feed.xml", tags: ["kubernetes"] },
  { name: "Docker Blog", url: "https://www.docker.com/blog/feed/", tags: ["containers"] },
  { name: "HashiCorp Blog", url: "https://www.hashicorp.com/blog/feed.xml", tags: ["infra"] },
  { name: "Grafana Labs", url: "https://grafana.com/blog/index.xml", tags: ["observability"] },
  { name: "JetBrains Blog", url: "https://blog.jetbrains.com/feed/", tags: ["devtools"] },
  { name: "Dropbox Tech", url: "https://dropbox.tech/feed", tags: ["scale"] },
  { name: "Discord Blog", url: "https://discord.com/blog/rss.xml", tags: ["realtime"] },
  { name: "Figma Blog", url: "https://www.figma.com/blog/feed/atom.xml", tags: ["frontend"] },
  { name: "Grab Engineering", url: "https://engineering.grab.com/feed.xml", tags: ["scale"] },
  { name: "The Pragmatic Engineer", url: "https://blog.pragmaticengineer.com/rss/", tags: ["engineering"] },
  { name: "Julia Evans", url: "https://jvns.ca/atom.xml", tags: ["systems"] },
  { name: "CNCF Blog", url: "https://www.cncf.io/feed/", tags: ["cloud-native"] },
  { name: "ByteByteGo", url: "https://blog.bytebytego.com/feed", tags: ["architecture"] },
  { name: "All Things Distributed", url: "https://www.allthingsdistributed.com/atom.xml", tags: ["distributed-systems"] },
];

export const HN = {
  frontPageLimit: 40,
  recentLimit: 40,
  minPoints: 40,
};

export const DEVTO = {
  perPage: 60,
  topDays: 7,
};

export const REDDIT = {
  subreddits: ["programming", "devops", "softwarearchitecture", "kubernetes", "dataengineering"],
  limit: 20,
  timeframe: "week",
};

export const GITHUB_TRENDING = {
  since: "daily",
  limit: 15,
};

/** Default lookback window for newly fetched items, in days. */
export const CRAWL_DAYS = Number(process.env.CRAWL_DAYS || 3);

/** Retention for the local dataset. */
export const RETENTION_DAYS = 120;
export const MAX_ARTICLES = 1000;

/** Cap how many articles get sent to the LLM each run. */
export const MAX_LLM_ARTICLES = Number(process.env.MAX_LLM_ARTICLES || 40);

export const USER_AGENT =
  "TechRadarBot/1.0 (+https://github.com/; polite crawler; contact repo owner)";
