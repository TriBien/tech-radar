# Tech Radar

A mobile-first technology radar that answers a simple question:

> How are real engineering teams using technology to solve real problems?

It crawls engineering blogs, Hacker News, DEV, Reddit, GitHub Trending and the curated
reading list (`reading_urls.txt`) every day,
removes duplicate stories, uses an LLM to extract the **problem → approach → outcome**
behind each story, and plots the technologies on a ThoughtWorks-style radar
(rings × quadrants). It is a fully static site — no backend — deployed to GitHub Pages.

## Features

- **Four rings** — Adopt, Trial, Assess, Hold.
- **Four quadrants** — Techniques, Tools, Platforms, Languages & Frameworks.
- **Problem-first feed** — every story shows the real problem, how the technology was
  used, and the outcome (when stated).
- **System Design tab** — a topic-filtered library of posts and blogs about software
  architecture, distributed systems, scaling, data, caching, messaging, reliability,
  security, observability, APIs and cloud infrastructure, collected from popular
  engineering pages.
- **Historical backfill + unlimited retention** — an optional backfill pulls
  system-design stories from 2020 onward, and the dataset is not capped by default.
- **Deduplication** — canonical URLs plus title-shingle similarity, so the same article
  from HN, Reddit and an RSS feed becomes one story.
- **Daily enrichment** — OpenAI-compatible LLM (GitHub Models by default) with a
  heuristic fallback when no credentials are available.
- **Mobile-first UX** — interactive SVG radar, list alternative, filter chips, search,
  bottom-sheet details, and on-device bookmarks.
- **Zero backend** — data is generated JSON committed by the crawler and served by
  GitHub Pages.

## Architecture

```
             ┌──────────────────────── GitHub Actions (daily cron) ───────────────────────┐
             │                                                                              │
 RSS/Atom ──▶│  fetch → normalize → dedupe → enrich (LLM + heuristics) → aggregate radar    │
 HN ────────▶│                                         │                                    │
 DEV ───────▶│                                         ▼                                    │
 Reddit ────▶│                          public/data/{articles,radar,meta}.json              │
 GitHub ────▶│                                         │                                    │
             └─────────────────────────────────────────┼────────────────────────────────────┘
                                                       ▼
                                        Vite build (static React app)
                                                       ▼
                                                 GitHub Pages
```

The crawler commits refreshed JSON to `main` and also builds/deploys the site in the same
workflow, so the Pages site updates immediately after each crawl.

## Quick start

Requires Node 20+.

```bash
npm install
npm run crawl   # fetch sources and generate public/data/*.json
npm run dev     # http://localhost:5173
```

If you only want to exercise the pipeline without network calls or an LLM:

```bash
npm run crawl:dry -- --sources=hackernews,devto --no-llm
```

### Crawler options

```bash
npm run crawl -- --sources=rss,hackernews,devto,reddit,github,reading
npm run crawl -- --no-llm        # heuristic enrichment only
npm run crawl -- --dry-run       # fetch + report, do not write files
npm run crawl -- --since=2020    # keep items published from 2020 onward
npm run crawl:backfill           # historical system-design backfill from 2020
```

`--year=YYYY` is kept as an alias for `--since=YYYY`. The backfill command uses Hacker
News' Algolia archive to discover architecture stories from 2020 onward, then classifies
and keeps only system-design matches. Article retention is unlimited by default, so
backfilled items are not pruned.

Environment knobs:

| Variable | Default | Purpose |
| --- | --- | --- |
| `LLM_API_KEY` | `GITHUB_TOKEN` | OpenAI-compatible API key |
| `LLM_BASE_URL` | `https://models.github.ai/inference` | API base URL |
| `LLM_MODEL` | `openai/gpt-4o-mini` | Model name |
| `MAX_LLM_ARTICLES` | `40` | Max articles enriched per run (`0` = unlimited) |
| `CRAWL_DAYS` | `3` | Lookback window for new source items |
| `INITIAL_CRAWL_YEAR` | _off_ | Backfill from this year onward (e.g. `2020`) |
| `RETENTION_DAYS` | `0` | Retention for the local dataset (`0` = unlimited) |
| `MAX_ARTICLES` | `0` | Maximum retained articles (`0` = unlimited) |
| `SYSTEM_DESIGN_ONLY` | `0` | Set to `1` to keep only system-design fetched items |
| `READING_URLS_FILE` | `reading_urls.txt` | Curated reading list crawled by the reading source |

The LLM is used to produce `summary`, `problem`, `approach`, `outcome`, technologies with
quadrant/ring suggestions, and tags. Without credentials, a built-in dictionary extracts
technologies and tags so the app still works.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. (Optional) Add a repository secret `LLM_API_KEY` for a provider of your choice. If it
   is absent, the workflow uses GitHub Models through the built-in `GITHUB_TOKEN`
   (`models: read` permission is already configured).
4. Run **Actions → Daily crawl → Run workflow** to populate data on demand.

The deploy workflow computes `BASE_PATH` automatically:

- project site (`owner/tech-radar`) → `/tech-radar/`
- user site (`owner/owner.github.io`) → `/`
- custom domain → create a repository variable `BASE_PATH` with the value `/`
  (Settings → Secrets and variables → Actions → Variables). It overrides the auto-detected path.

The daily crawl runs at **05:17 UTC**. Edit `.github/workflows/crawl.yml` to change it.

### Using another LLM provider

Any OpenAI-compatible chat-completions endpoint works. Example (Groq):

```
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
LLM_API_KEY=<secret>
```

## How the radar is computed

- Each story contributes technology mentions with a recency weight.
- A technology's **ring** is the weighted mode of the ring votes from its stories
  (LLM suggestions, or dictionary defaults in heuristic mode).
- A technology's **quadrant** is the weighted mode of its mentions.
- **Trend** compares mentions in the last 21 days with the previous 21–60 days.
- Items are scored by mention volume, recent velocity, engagement and ring, then capped
  at 20 per quadrant so the radar stays readable.
- **Hold** is only assigned when the model/dictionary explicitly votes for it.

## Deduplication

1. URLs are canonicalized (tracking params removed, `www` stripped, HTTPS, sorted query).
2. Exact canonical URL matches are merged immediately.
3. Title token sets are compared with Jaccard + containment similarity thresholds,
   including a more permissive same-host rule.
4. When duplicates merge, engagement, technologies, tags and the best summary are kept.

## Project structure

```
crawler/
  config.ts               feeds, subreddits, limits
  run.ts                  pipeline entry point
  build-radar.ts          technology aggregation + ring/trend scoring
  store.ts                read/prune/write public/data
  sources/                rss, hackernews, devto, reddit, github, reading
  lib/dedupe.ts           canonical URLs + title similarity
  lib/heuristics.ts       technology dictionary + offline enrichment
  lib/llm.ts              batched, validated LLM enrichment
shared/types.ts           data model shared by crawler and UI
shared/system-design.ts   architecture topic taxonomy + relevance classifier
src/                      React + Vite mobile-first UI
public/data/              generated JSON (committed)
.github/workflows/        deploy.yml + crawl.yml
```

## Customization

- **Add a blog:** edit `FEEDS` in `crawler/config.ts`.
- **Add a reading source:** add the blog URL to `reading_urls.txt`.
- **Add subreddits:** edit `REDDIT.subreddits` in `crawler/config.ts`.
- **Improve offline extraction:** extend `TECH_DICTIONARY` in
  `crawler/lib/heuristics.ts`.
- **Tune the System Design tab:** edit the topic keywords and relevance rules in
  `shared/system-design.ts`; the crawler stores matching `topics` on each article.
- **Change the radar shape:** edit ring/quadrant definitions in `shared/types.ts` and
  the colors/labels in `src/lib/radar.ts`.
- **Retention:** `RETENTION_DAYS` and `MAX_ARTICLES` in `crawler/config.ts`.

## Limitations & next steps

- **Reddit** frequently blocks datacenter IPs (including CI runners). The source is
  implemented and fails gracefully; if you hit 403s, disable it or point it at a
  permitted endpoint. RSS, Hacker News, DEV and GitHub Trending are unaffected.
- Summaries are based on RSS excerpts, not full article text; adding readability
  extraction would improve `approach`/`outcome` quality.
- Deduping is lexical. Embedding-based near-duplicate detection would catch
  rewrites and syndicated posts better.
- Data is only as fresh as the last daily run (trigger the workflow for an instant refresh).
- Possible extensions: topic subscriptions, weekly digest, per-team radar profiles,
  semantic search, and an editorial override file for ring assignments.
