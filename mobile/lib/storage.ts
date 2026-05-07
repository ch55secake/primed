import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SourceId } from "@interview-prep/parser";

const LAST_REFRESH_KEY = (id: SourceId) => `lastRefresh:${id}`;
const LAST_PAGE_KEY = (id: SourceId, itemId: number) => `lastPage:${id}:${itemId}`;

export async function setLastRefreshed(id: SourceId, ms: number): Promise<void> {
  await AsyncStorage.setItem(LAST_REFRESH_KEY(id), String(ms));
}

export async function getLastRefreshed(id: SourceId): Promise<number | null> {
  const raw = await AsyncStorage.getItem(LAST_REFRESH_KEY(id));
  return raw ? Number(raw) : null;
}

export async function setLastPage(id: SourceId, itemId: number, page: number): Promise<void> {
  await AsyncStorage.setItem(LAST_PAGE_KEY(id, itemId), String(page));
}

export async function getLastPage(id: SourceId, itemId: number): Promise<number> {
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
