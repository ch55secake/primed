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
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "light" | "dark";
export type ReadingMode = "page" | "scroll";

export interface Settings {
  themeMode: ThemeMode;
  readingMode: ReadingMode;
  volumeKeyNav: boolean;
  /**
   * Optimised for e-ink displays (Boox / Kindle / Kobo). When on:
   *  - reader uses tap zones instead of swipe paging
   *  - all Stack screen animations are suppressed
   *  - haptics are silenced
   *  - reading mode is forced to "page" (scroll is unusable on e-ink)
   * Auto-defaults to true on Boox / Onyx hardware; user override always wins.
   */
  eInkMode: boolean;
  /**
   * Multiplier applied to every font size and line-height in the reader,
   * including code blocks and pagination's char-per-line estimate. Stored
   * as a number for forward-compat with a future continuous slider; the
   * Settings UI today exposes four discrete steps:
   *   0.85 (S) | 1.0 (M) | 1.15 (L) | 1.3 (XL).
   */
  fontScale: number;
}

/** Probe Android's manufacturer string for known e-ink vendors. */
function detectEInkDefault(): boolean {
  if (Platform.OS !== "android") return false;
  const mfr = (Platform.constants as { Manufacturer?: string }).Manufacturer;
  return !!mfr && /onyx|boox/i.test(mfr);
}

const DEFAULTS: Settings = {
  themeMode: "system",
  readingMode: "page",
  volumeKeyNav: true,
  eInkMode: detectEInkDefault(),
  fontScale: 1.0,
};

const STORAGE_KEY = "drilly:settings";

interface SettingsContextValue {
  settings: Settings;
  /** Hydrated from AsyncStorage. False during the brief mount window. */
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  // Hydrate once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Settings>;
          setSettings({ ...DEFAULTS, ...parsed });
        }
      } catch {
        // Corrupt blob — drop it, fall back to defaults
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      // Fire-and-forget persist; failure is non-fatal
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ settings, ready, update }),
    [settings, ready, update],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside <SettingsProvider>");
  return ctx.settings;
}

export function useUpdateSettings(): (patch: Partial<Settings>) => void {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useUpdateSettings must be inside <SettingsProvider>");
  return ctx.update;
}

export function useSettingsReady(): boolean {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettingsReady must be inside <SettingsProvider>");
  return ctx.ready;
}
