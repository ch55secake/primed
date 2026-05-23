import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import * as FS from "expo-file-system/legacy";
import { SOURCES, type SourceConfig } from "./parser";

const IS_WEB = Platform.OS === "web";
const REMOTE_BASE = "https://drilly-rjh-mopjones-projects.vercel.app";
const MANIFEST_FILE = "manifest.json";
const CACHE_DIR = IS_WEB ? "" : (FS.cacheDirectory ?? "") + "content/";
const CACHE_PATH = CACHE_DIR + MANIFEST_FILE;

// Bundled fallback — copied from web/public into mobile/assets/content at build time
const BUNDLED = require("../assets/content/manifest.json");

interface ManifestFile {
  version: number;
  sources: SourceConfig[];
}

async function ensureCacheDir(): Promise<void> {
  if (IS_WEB) return; // browser HTTP cache covers caching on web
  const info = await FS.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FS.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function fromBundled(): SourceConfig[] {
  const m = BUNDLED as ManifestFile;
  if (m && Array.isArray(m.sources) && m.sources.length > 0) return m.sources;
  // Last-ditch: the SOURCES map from parser.ts as a literal seed.
  return Object.values(SOURCES);
}

/**
 * Load the manifest.
 *
 * Web: fetch `/manifest.json` from the same origin; no filesystem cache.
 * Native: cache-first via expo-file-system; bundled JSON as offline fallback.
 *
 * Never throws — falls back to bundled defaults so the app keeps working.
 */
export async function loadManifest(): Promise<SourceConfig[]> {
  if (IS_WEB) {
    try {
      const res = await fetch("/" + MANIFEST_FILE);
      if (res.ok) {
        const parsed = (await res.json()) as ManifestFile;
        if (parsed?.sources?.length) return parsed.sources;
      }
    } catch {
      // Network failed — fall through to bundled defaults
    }
    return fromBundled();
  }

  await ensureCacheDir();
  const info = await FS.getInfoAsync(CACHE_PATH);
  if (info.exists) {
    try {
      const raw = await FS.readAsStringAsync(CACHE_PATH);
      const parsed = JSON.parse(raw) as ManifestFile;
      if (parsed?.sources?.length) return parsed.sources;
    } catch {
      // Cached blob is corrupt — fall through to bundled
    }
  }

  // First launch — seed cache from the bundled JSON. Metro inlines JSON as a
  // parsed object via require(), so we just stringify it back to disk.
  const sources = fromBundled();
  try {
    await FS.writeAsStringAsync(
      CACHE_PATH,
      JSON.stringify({ version: 1, sources } satisfies ManifestFile),
    );
  } catch {
    // Cache write failure is non-fatal — we'll re-seed next launch.
  }
  return sources;
}

/**
 * Refresh the manifest. Web: re-fetches with cache:reload. Native: downloads
 * to FS cache. Throws on network error so callers can keep using current.
 */
export async function refreshManifest(): Promise<SourceConfig[]> {
  if (IS_WEB) {
    const url = `/${MANIFEST_FILE}?t=${Date.now()}`;
    const res = await fetch(url, { cache: "reload" });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    const parsed = (await res.json()) as ManifestFile;
    if (!parsed?.sources?.length) {
      throw new Error("Manifest at " + url + " has no sources");
    }
    return parsed.sources;
  }
  await ensureCacheDir();
  const url = `${REMOTE_BASE}/${MANIFEST_FILE}`;
  const result = await FS.downloadAsync(url, CACHE_PATH);
  if (result.status !== 200) {
    throw new Error(`HTTP ${result.status} fetching ${url}`);
  }
  const raw = await FS.readAsStringAsync(CACHE_PATH);
  const parsed = JSON.parse(raw) as ManifestFile;
  if (!parsed?.sources?.length) {
    throw new Error("Manifest at " + url + " has no sources");
  }
  return parsed.sources;
}

// ---- React context ----------------------------------------------------------

interface ManifestContextValue {
  sources: SourceConfig[];
  ready: boolean;
  /** Force a remote refresh — used by pull-to-refresh in ItemList. */
  refresh: () => Promise<void>;
}

const ManifestContext = createContext<ManifestContextValue | null>(null);

export function ManifestProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<SourceConfig[]>(fromBundled);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadManifest();
        if (!cancelled) setSources(loaded);
      } catch {
        // Already seeded with bundled defaults
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    const fresh = await refreshManifest();
    setSources(fresh);
  }, []);

  const value = useMemo(
    () => ({ sources, ready, refresh }),
    [sources, ready, refresh],
  );

  return (
    <ManifestContext.Provider value={value}>
      {children}
    </ManifestContext.Provider>
  );
}

export function useManifest(): ManifestContextValue {
  const ctx = useContext(ManifestContext);
  if (!ctx) throw new Error("useManifest must be inside <ManifestProvider>");
  return ctx;
}

/** Look up a single source by id from the current manifest, or undefined. */
export function useSource(id: string): SourceConfig | undefined {
  const { sources } = useManifest();
  return sources.find((s) => s.id === id);
}
