import AsyncStorage from "@react-native-async-storage/async-storage";

// Source ids are open — the manifest can add new ones at runtime, so storage
// keys must accept any string rather than the narrow union from parser.ts.
type SourceKey = string;

const LAST_REFRESH_KEY = (id: SourceKey) => `lastRefresh:${id}`;
const ITEM_COUNT_KEY = (id: SourceKey) => `itemCount:${id}`;
/** Per-item revealed-sections set. JSON array of section names. */
const REVEALED_KEY = (id: SourceKey, itemId: number) =>
  `revealed:${id}:${itemId}`;
const REVEALED_PREFIX = (id: SourceKey) => `revealed:${id}:`;
/** Set by the home-screen refresh-all button after a successful sweep. */
const LAST_FULL_REFRESH_KEY = "drilly:lastFullRefresh";

export async function setLastRefreshed(
  id: SourceKey,
  ms: number,
): Promise<void> {
  await AsyncStorage.setItem(LAST_REFRESH_KEY(id), String(ms));
}

export async function getLastRefreshed(
  id: SourceKey,
): Promise<number | null> {
  const raw = await AsyncStorage.getItem(LAST_REFRESH_KEY(id));
  return raw ? Number(raw) : null;
}

/**
 * Cache the parsed item count for a source so the home library can render
 * "{count} items" without re-loading + re-parsing markdown for every card.
 * Written by ItemList right after parseContent succeeds.
 */
export async function setItemCount(
  id: SourceKey,
  count: number,
): Promise<void> {
  await AsyncStorage.setItem(ITEM_COUNT_KEY(id), String(count));
}

export async function getItemCount(id: SourceKey): Promise<number | null> {
  const raw = await AsyncStorage.getItem(ITEM_COUNT_KEY(id));
  return raw ? Number(raw) : null;
}

/**
 * Read the set of revealed section names for a given item. Empty array if
 * never opened or no sections expanded yet.
 */
export async function getRevealedSections(
  id: SourceKey,
  itemId: number,
): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(REVEALED_KEY(id, itemId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function setRevealedSections(
  id: SourceKey,
  itemId: number,
  names: string[],
): Promise<void> {
  await AsyncStorage.setItem(REVEALED_KEY(id, itemId), JSON.stringify(names));
}

/**
 * How many items in this source have at least one revealed section. Powers
 * the home-library "% read" progress label on each <SourceCard>.
 */
export async function getProgressCount(id: SourceKey): Promise<number> {
  const keys = await AsyncStorage.getAllKeys();
  const prefix = REVEALED_PREFIX(id);
  let n = 0;
  for (const k of keys) {
    if (!k.startsWith(prefix)) continue;
    const raw = await AsyncStorage.getItem(k);
    if (raw && raw !== "[]") n += 1;
  }
  return n;
}

/**
 * Wall-clock of the last successful "refresh everything" sweep from the
 * home screen.
 */
export async function setLastFullRefresh(ms: number): Promise<void> {
  await AsyncStorage.setItem(LAST_FULL_REFRESH_KEY, String(ms));
}

export async function getLastFullRefresh(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(LAST_FULL_REFRESH_KEY);
  return raw ? Number(raw) : null;
}

export function formatRelativeTime(ms: number): string {
  const elapsed = Date.now() - ms;
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
