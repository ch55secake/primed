// Use the legacy API — stable, matches the FileSystem.cacheDirectory pattern.
// The new API (Paths/File/Directory) is fine but verbose for this use case.
import * as FS from "expo-file-system/legacy";
import { Asset } from "expo-asset";
import type { SourceId } from "@interview-prep/parser";

const REMOTE_BASE = "https://interview-prep-delta-brown.vercel.app";

const FILES: Record<SourceId, string> = {
  patterns: "patterns.md",
  neetcode: "neetcode-150.md",
  java: "java-interview-primer.md",
};

// Bundled fallbacks — copied from web/public into mobile/assets/content/ at build time
const BUNDLED: Record<SourceId, number> = {
  patterns: require("../assets/content/patterns.md"),
  neetcode: require("../assets/content/neetcode-150.md"),
  java: require("../assets/content/java-interview-primer.md"),
};

const CACHE_DIR = (FS.cacheDirectory ?? "") + "content/";

async function ensureCacheDir(): Promise<void> {
  const info = await FS.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FS.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/**
 * Load a source's markdown — prefers cache, falls back to bundled asset on first launch.
 * Never throws; offline always works.
 */
export async function loadSource(id: SourceId): Promise<string> {
  await ensureCacheDir();
  const cachePath = CACHE_DIR + FILES[id];

  const info = await FS.getInfoAsync(cachePath);
  if (info.exists) {
    return FS.readAsStringAsync(cachePath);
  }

  // First launch — read bundled asset, populate cache for next time
  const asset = Asset.fromModule(BUNDLED[id]);
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error(`Asset has no localUri for ${id}`);
  const md = await FS.readAsStringAsync(asset.localUri);
  await FS.writeAsStringAsync(cachePath, md);
  return md;
}

/**
 * Refresh a single source from the Vercel endpoint, overwriting the cache.
 * Throws on network error — caller should fall back to cached / bundled.
 */
export async function refreshSource(id: SourceId): Promise<string> {
  await ensureCacheDir();
  const url = `${REMOTE_BASE}/${FILES[id]}`;
  const cachePath = CACHE_DIR + FILES[id];
  const result = await FS.downloadAsync(url, cachePath);
  if (result.status !== 200) {
    throw new Error(`HTTP ${result.status} fetching ${url}`);
  }
  return FS.readAsStringAsync(cachePath);
}

/**
 * Refresh all three sources in parallel.
 */
export async function refreshAll(): Promise<void> {
  await Promise.all((Object.keys(FILES) as SourceId[]).map(refreshSource));
}
