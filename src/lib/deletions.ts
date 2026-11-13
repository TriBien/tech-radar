const DELETED_KEY = "tech-radar:deleted";

export function readDeleted(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((id): id is string => typeof id === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

export function saveDeleted(ids: Set<string>): void {
  try {
    localStorage.setItem(DELETED_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage can be unavailable in private mode; deleted stories stay hidden in memory.
  }
}
