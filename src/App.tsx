import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { Article, RadarItem } from "../shared/types";
import { ArticleCard } from "./components/ArticleCard";
import { ArticleSheet } from "./components/ArticleSheet";
import { EmptyState } from "./components/EmptyState";
import { Feed } from "./components/Feed";
import {
  BookmarkIcon,
  CloseIcon,
  FeedIcon,
  MoonIcon,
  RadarIcon,
  SearchIcon,
  SunIcon,
} from "./components/Icons";
import { RadarView } from "./components/RadarView";
import { TechSheet } from "./components/TechSheet";
import { relativeTime } from "./lib/format";
import { loadAppData, type AppData } from "./lib/data";

type Tab = "radar" | "feed" | "saved";
type Theme = "light" | "dark";

const SAVED_KEY = "tech-radar:saved";
const THEME_KEY = "tech-radar:theme";

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function readSaved(): Set<string> {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((id): id is string => typeof id === "string")) : new Set();
  } catch {
    return new Set();
  }
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("radar");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [savedIds, setSavedIds] = useState<Set<string>>(readSaved);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#070b16" : "#f4f7fb");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage can be unavailable in private mode; the theme stays in memory.
    }
  }, [theme]);

  useEffect(() => {
    let active = true;
    loadAppData().then((result) => {
      if (!active) return;
      setData(result);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify([...savedIds]));
    } catch {
      // Storage can be unavailable in private mode; bookmarks stay in memory.
    }
  }, [savedIds]);

  const articles = data?.articles ?? [];
  const radarItems = data?.radar.items ?? [];
  const selectedArticle = useMemo(
    () => articles.find((article) => article.id === selectedArticleId) ?? null,
    [articles, selectedArticleId],
  );
  const selectedTech = useMemo(
    () => radarItems.find((item) => item.id === selectedTechId) ?? null,
    [radarItems, selectedTechId],
  );
  const savedArticles = useMemo(
    () => articles.filter((article) => savedIds.has(article.id)),
    [articles, savedIds],
  );

  const toggleSave = (id: string) => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openArticle = (article: Article) => {
    setSelectedTechId(null);
    setSelectedArticleId(article.id);
  };

  const openTech = (item: RadarItem) => {
    setSelectedArticleId(null);
    setSelectedTechId(item.id);
  };

  const openTechByName = (name: string) => {
    const item = radarItems.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase());
    if (item) {
      setTab("radar");
      openTech(item);
    } else {
      setTab("radar");
      setQuery(name);
      setSelectedArticleId(null);
    }
  };

  const openArticleFromTech = (article: Article) => {
    setSelectedTechId(null);
    setSelectedArticleId(article.id);
  };

  const lastRun = data?.meta?.lastRun;

  if (loading) {
    return (
      <div className="app loading-screen">
        <div className="loading-radar" aria-hidden="true" />
        <p>Loading the radar…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">
              <RadarIcon size={24} />
            </span>
            <div className="brand-text">
              <h1>Tech Radar</h1>
              <p>How teams use technology to solve real problems</p>
            </div>
          </div>

          <div className="header-meta">
            <div className="header-actions">
              {lastRun && (
                <span className="updated">
                  <span className="live-dot" aria-hidden="true" />
                  Updated {relativeTime(lastRun)}
                </span>
              )}
              <button
                type="button"
                className="theme-toggle"
                onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
                title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              >
                {theme === "light" ? <MoonIcon size={17} /> : <SunIcon size={17} />}
              </button>
            </div>
            <span className="header-stats">
              {articles.length} stories · {radarItems.length} technologies
            </span>
          </div>
        </div>

        <div className="search-row">
          <div className="search">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                tab === "feed" ? "Search stories, teams, problems…" : "Search technologies and topics…"
              }
              aria-label="Search"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                <CloseIcon size={16} />
              </button>
            )}
          </div>

          <nav className="desktop-tabs" aria-label="Sections">
            <button
              type="button"
              className={tab === "radar" ? "is-active" : ""}
              onClick={() => setTab("radar")}
            >
              <RadarIcon size={18} /> Radar
            </button>
            <button
              type="button"
              className={tab === "feed" ? "is-active" : ""}
              onClick={() => setTab("feed")}
            >
              <FeedIcon size={18} /> Feed
            </button>
            <button
              type="button"
              className={tab === "saved" ? "is-active" : ""}
              onClick={() => setTab("saved")}
            >
              <BookmarkIcon size={18} /> Saved
              {savedIds.size > 0 && <span className="nav-badge">{savedIds.size}</span>}
            </button>
          </nav>
        </div>
      </header>

      <main className="content">
        {articles.length === 0 ? (
          <EmptyState
            title="The radar is empty"
            code="npm run crawl"
          >
            Run the daily crawler to discover engineering stories, or trigger the “Daily crawl”
            workflow in GitHub Actions.
          </EmptyState>
        ) : tab === "radar" ? (
          <RadarView
            items={radarItems}
            query={deferredQuery}
            selectedId={selectedTechId ?? undefined}
            onOpenTech={openTech}
          />
        ) : tab === "feed" ? (
          <Feed
            articles={articles}
            query={deferredQuery}
            savedIds={savedIds}
            onOpen={openArticle}
            onToggleSave={toggleSave}
          />
        ) : (
          <section className="feed" aria-label="Saved stories">
            <p className="result-count">
              {savedArticles.length} saved {savedArticles.length === 1 ? "story" : "stories"}
            </p>
            {savedArticles.length === 0 ? (
              <EmptyState title="No saved stories yet">
                Tap the bookmark on any story to keep it here. Bookmarks are stored on this device.
              </EmptyState>
            ) : (
              <div className="card-list">
                {savedArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    saved
                    onOpen={openArticle}
                    onToggleSave={toggleSave}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="site-footer">
        <span>Built for solution architects · Data refreshed daily via GitHub Actions</span>
        <span>Bookmarks stay on this device</span>
      </footer>

      <nav className="bottom-nav" aria-label="Sections">
        <button
          type="button"
          className={tab === "radar" ? "is-active" : ""}
          onClick={() => setTab("radar")}
        >
          <RadarIcon size={21} />
          <span>Radar</span>
        </button>
        <button
          type="button"
          className={tab === "feed" ? "is-active" : ""}
          onClick={() => setTab("feed")}
        >
          <FeedIcon size={21} />
          <span>Feed</span>
        </button>
        <button
          type="button"
          className={tab === "saved" ? "is-active" : ""}
          onClick={() => setTab("saved")}
        >
          <BookmarkIcon size={21} />
          <span>Saved</span>
          {savedIds.size > 0 && <span className="nav-badge">{savedIds.size}</span>}
        </button>
      </nav>

      {selectedArticle && (
        <ArticleSheet
          article={selectedArticle}
          saved={savedIds.has(selectedArticle.id)}
          onClose={() => setSelectedArticleId(null)}
          onToggleSave={toggleSave}
          onTechClick={openTechByName}
        />
      )}

      {selectedTech && (
        <TechSheet
          item={selectedTech}
          articles={articles}
          onClose={() => setSelectedTechId(null)}
          onOpenArticle={openArticleFromTech}
        />
      )}
    </div>
  );
}
