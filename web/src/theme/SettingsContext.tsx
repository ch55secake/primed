import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export interface Settings {
  fontScale: number;
  autoRevealSummary: boolean;
  eReaderMode: boolean;
}

const STORAGE_KEY = "sdf:settings:v1";

const DEFAULTS: Settings = {
  fontScale: 1.0,
  autoRevealSummary: true,
  eReaderMode: false,
};

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsCtx = createContext<Ctx>({
  settings: DEFAULTS,
  update: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.style.setProperty(
      "--font-scale",
      String(settings.fontScale),
    );
  }, [settings]);

  const update = (patch: Partial<Settings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  return (
    <SettingsCtx.Provider value={{ settings, update }}>
      {children}
    </SettingsCtx.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsCtx);
}
