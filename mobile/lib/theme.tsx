import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { useSettings } from "./settings";

export interface Palette {
  /** Primary surface — page background. */
  bg: string;
  /** Chrome bars (header, tab bar, indicator). */
  surface: string;
  /** Subtle pressed/hover background. */
  surfacePressed: string;
  /** Dividers + outlines. */
  border: string;
  /** Body copy. */
  text: string;
  /** Labels / metadata. */
  textMuted: string;
  /** Headings / strong emphasis. */
  textStrong: string;
  /** Primary action (links, active chip, accents). */
  accent: string;
  /** Inline + fenced code background. */
  codeBg: string;
  /** Code foreground (for fenced blocks). */
  codeFg: string;
  /** Foreground for warnings / error banners. */
  errorFg: string;
  /** Background for error banners. */
  errorBg: string;
  /** Border for error banners. */
  errorBorder: string;
  /** "dark" or "light" — handed to <StatusBar style={...}>. */
  scheme: "dark" | "light";
}

const DARK: Palette = {
  bg: "#0b0d12",
  surface: "#11141b",
  surfacePressed: "#161a23",
  border: "#232938",
  text: "#d6dae4",
  textMuted: "#8a93a6",
  textStrong: "#ffffff",
  accent: "#7c9cff",
  codeBg: "#1f2028",
  codeFg: "#d6dae4",
  errorFg: "#fbbf24",
  errorBg: "#3a2625",
  errorBorder: "#7a3b3a",
  scheme: "dark",
};

const LIGHT: Palette = {
  bg: "#ffffff",
  surface: "#f5f6f9",
  surfacePressed: "#e8ebf2",
  border: "#d8dce4",
  text: "#1d2330",
  textMuted: "#5b6577",
  textStrong: "#0b0d12",
  accent: "#3253c7",
  codeBg: "#f0f1f5",
  codeFg: "#1d2330",
  errorFg: "#a14a00",
  errorBg: "#fff3e0",
  errorBorder: "#f0c896",
  scheme: "light",
};

const ThemeContext = createContext<Palette | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { themeMode } = useSettings();
  const systemScheme = useColorScheme();

  const palette = useMemo(() => {
    const effective =
      themeMode === "system" ? (systemScheme ?? "dark") : themeMode;
    return effective === "light" ? LIGHT : DARK;
  }, [themeMode, systemScheme]);

  return (
    <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Palette {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside <ThemeProvider>");
  return ctx;
}
