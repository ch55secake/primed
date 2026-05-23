// HOW TO ADD A NEW SOURCE  (no app rebuild required)
// ====================================================================
// 1. Drop the markdown file into web/public/<my-source>.md.
// 2. Append an entry to web/public/manifest.json with at minimum:
//      { id, file, title, itemLabel, itemsPlural, storagePrefix,
//        defaultRevealedSections, sectionOrder }
//    Optional overrides: itemHeadingLevel, sectionHeadingLevel,
//    autoNumberItems. Mirror an existing entry as a starting point.
// 3. Deploy to Vercel — `bun run --cwd web build` then redeploy.
// 4. In the app, tap the home-screen ↻ refresh button (or pull-to-refresh
//    any source). The new chip appears, the markdown loads on first tap.
//
// The BUNDLED map below is purely the offline-first-launch fallback for
// the original three sources. Anything new is fetched live; the empty
// cache simply triggers refreshSource() on first read.
// ====================================================================

// Use the legacy API — stable, matches the FileSystem.cacheDirectory pattern.
// The new API (Paths/File/Directory) is fine but verbose for this use case.
import { Platform } from "react-native";
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

const IS_WEB = Platform.OS === "web";
const CACHE_DIR = IS_WEB ? "" : (FS.cacheDirectory ?? "") + "content/";

async function ensureCacheDir(): Promise<void> {
  if (IS_WEB) return; // Browser HTTP cache covers caching on web.
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
 * Web: fetch from the same origin (Expo Web export + content are co-hosted
 * at the deploy root), so a relative URL is enough. Native: hit REMOTE_BASE
 * directly because the device has no notion of "same origin".
 */
function webUrl(cfg: SourceConfig): string {
  return cfg.file.startsWith("/") ? cfg.file : "/" + cfg.file;
}
function nativeUrl(cfg: SourceConfig): string {
  return `${REMOTE_BASE}${cfg.file.startsWith("/") ? cfg.file : "/" + cfg.file}`;
}

/**
 * Load a source's markdown.
 *
 * Web: fetch over HTTP, no filesystem cache (the browser caches GETs for us).
 * Native: cache-first via expo-file-system; bundled asset as offline fallback
 * on first launch; remote-only sources fall through to refreshSource.
 */
export async function loadSource(cfg: SourceConfig): Promise<string> {
  if (IS_WEB) {
    const res = await fetch(webUrl(cfg));
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${webUrl(cfg)}`);
    return res.text();
  }

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
 * Refresh a single source. On web, re-fetches with `cache: "reload"` so
 * the browser/WebView HTTP cache is bypassed for this request AND the
 * fresh response is written back to the **canonical** URL's cache entry.
 * Don't add a `?t=…` cache-buster — that would store the fresh response
 * under a different cache key than subsequent normal loads request, so
 * the warm-the-cache effect would never apply. The whole point of this
 * call is for the Android WebView shell: hit refresh once online and
 * every primer is now in the WebView cache at its canonical URL, ready
 * to be served offline by `cacheMode="LOAD_CACHE_ELSE_NETWORK"`.
 * On native, downloads to the FS cache and overwrites. Throws on network
 * error so the caller can fall back to whatever it already has.
 */
export async function refreshSource(cfg: SourceConfig): Promise<string> {
  if (IS_WEB) {
    const url = webUrl(cfg);
    const res = await fetch(url, { cache: "reload" });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return res.text();
  }
  await ensureCacheDir();
  const url = nativeUrl(cfg);
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

/**
 * External CDN resources the rendered page lazy-loads. We fetch each one
 * with `cache: "reload"` from a "refresh everything" handler so the
 * Android WebView's HTTP cache contains them at their canonical URL,
 * keeping the offline experience whole even for content the user hasn't
 * navigated to online first.
 *
 * Currently: mermaid (`MermaidView` builds an HTML page that pulls this
 * script via `<script src=…>`). If we add more external assets later
 * (custom fonts, other libs), list them here.
 */
const EXTERNAL_CACHE_URLS: readonly string[] = [
  "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js",
];

/**
 * Warm the WebView HTTP cache for external (CDN-hosted) resources the
 * site lazy-loads on demand. No-op outside of web — native paths don't
 * benefit from the WebView cache. Errors are swallowed; warming is
 * best-effort and the site still works (online) without it.
 */
export async function warmExternalCaches(): Promise<void> {
  if (!IS_WEB) return;
  await Promise.all(
    EXTERNAL_CACHE_URLS.map((url) =>
      fetch(url, { cache: "reload", mode: "no-cors" }).catch(() => {}),
    ),
  );
}
