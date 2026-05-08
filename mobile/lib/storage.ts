import AsyncStorage from "@react-native-async-storage/async-storage";

// Source ids are open — the manifest can add new ones at runtime, so storage
// keys must accept any string rather than the narrow union from parser.ts.
type SourceKey = string;

const LAST_REFRESH_KEY = (id: SourceKey) => `lastRefresh:${id}`;
const LAST_PAGE_KEY = (id: SourceKey, itemId: number) =>
  `lastPage:${id}:${itemId}`;

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

export async function setLastPage(
  id: SourceKey,
  itemId: number,
  page: number,
): Promise<void> {
  await AsyncStorage.setItem(LAST_PAGE_KEY(id, itemId), String(page));
}

export async function getLastPage(
  id: SourceKey,
  itemId: number,
): Promise<number> {
  const raw = await AsyncStorage.getItem(LAST_PAGE_KEY(id, itemId));
  return raw ? Number(raw) : 0;
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
