import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Article } from "../../shared/types.js";
import { DELETED_URLS_FILE } from "../config.js";
import { canonicalUrl } from "./dedupe.js";

export interface Blocklist {
  ids: Set<string>;
  urls: Set<string>;
}

/** Load the optional permanent deletion list (`deleted_urls.txt`). */
export async function loadBlocklist(): Promise<Blocklist> {
  const ids = new Set<string>();
  const urls = new Set<string>();

  try {
    const raw = await readFile(path.resolve(process.cwd(), DELETED_URLS_FILE), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const value = line.trim();
      if (!value || value.startsWith("#")) continue;
      ids.add(value);
      urls.add(canonicalUrl(value));
    }
  } catch {
    // The file is optional; a missing blocklist means nothing is deleted.
  }

  return { ids, urls };
}

export function isBlocked(article: Article, blocklist: Blocklist): boolean {
  if (blocklist.ids.has(article.id)) return true;
  return blocklist.urls.has(article.url) || blocklist.urls.has(canonicalUrl(article.url));
}
