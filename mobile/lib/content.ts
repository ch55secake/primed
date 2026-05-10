// Use the legacy API — stable, matches the FileSystem.cacheDirectory pattern.
// The new API (Paths/File/Directory) is fine but verbose for this use case.
import * as FS from "expo-file-system/legacy";
import { Asset } from "expo-asset";
import type { SourceConfig } from "./parser";

const REMOTE_BASE = "https://drilly-rjh-mopjones-projects.vercel.app";

// Bundled fallbacks — copied from web/public into mobile/assets/content/ at build time.
// Keyed by id of the original three sources; remote-only sources don't have an entry
// here (they fall back to "show empty" rather than a stale bundle).
const BUNDLED: Record<string, number> = {
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

/** Strip a leading "/" so the file name is safe to append to a directory path. */
function fileName(file: string): string {
  return file.replace(/^\//, "");
}

/**
 * Load a source's markdown — prefers cache, falls back to bundled asset on first launch.
 * For sources added via remote manifest with no bundled fallback, throws if the cache is
 * empty so the caller can show a "pull to refresh" hint.
 */
export async function loadSource(cfg: SourceConfig): Promise<string> {
  await ensureCacheDir();
  const cachePath = CACHE_DIR + fileName(cfg.file);

  const info = await FS.getInfoAsync(cachePath);
  if (info.exists) {
    return FS.readAsStringAsync(cachePath);
  }

  const bundle = BUNDLED[cfg.id];
  if (!bundle) {
    // Remote-only source — try to fetch on the spot so the empty state isn't permanent.
    return refreshSource(cfg);
  }

  // First launch — read bundled asset, populate cache for next time
  const asset = Asset.fromModule(bundle);
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error(`Asset has no localUri for ${cfg.id}`);
  const md = await FS.readAsStringAsync(asset.localUri);
  await FS.writeAsStringAsync(cachePath, md);
  return md;
}

/**
 * Refresh a single source from the Vercel endpoint, overwriting the cache.
 * Throws on network error — caller should fall back to cached / bundled.
 */
export async function refreshSource(cfg: SourceConfig): Promise<string> {
  await ensureCacheDir();
  const url = `${REMOTE_BASE}${cfg.file.startsWith("/") ? cfg.file : "/" + cfg.file}`;
  const cachePath = CACHE_DIR + fileName(cfg.file);
  const result = await FS.downloadAsync(url, cachePath);
  if (result.status !== 200) {
    throw new Error(`HTTP ${result.status} fetching ${url}`);
  }
  return FS.readAsStringAsync(cachePath);
}

/**
 * Refresh all sources currently known to the manifest in parallel.
 */
export async function refreshAll(sources: SourceConfig[]): Promise<void> {
  await Promise.all(sources.map(refreshSource));
}
