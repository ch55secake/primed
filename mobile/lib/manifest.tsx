import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as FS from "expo-file-system/legacy";
import { SOURCES, type SourceConfig } from "./parser";

const REMOTE_BASE = "https://drilly-rjh-mopjones-projects.vercel.app";
const MANIFEST_FILE = "manifest.json";
const CACHE_DIR = (FS.cacheDirectory ?? "") + "content/";
const CACHE_PATH = CACHE_DIR + MANIFEST_FILE;

// Bundled fallback — copied from web/public into mobile/assets/content at build time
const BUNDLED = require("../assets/content/manifest.json");

interface ManifestFile {
  version: number;
  sources: SourceConfig[];
}

async function ensureCacheDir(): Promise<void> {
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
 * Load the manifest — prefers cache, falls back to bundled JSON on first launch.
 * Never throws; the app must keep working offline on first install.
 */
export async function loadManifest(): Promise<SourceConfig[]> {
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
 * Refresh the manifest from the Vercel endpoint, overwriting the cache.
 * Throws on network error — caller decides whether to keep using current.
 */
export async function refreshManifest(): Promise<SourceConfig[]> {
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
