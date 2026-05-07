import mermaid from "mermaid";

export type ThemeMode = "dark" | "light";

let currentTheme: ThemeMode | null = null;

const darkVars = {
  darkMode: true,
  background: "#0a0c12",
  primaryColor: "#1a2030",
  primaryTextColor: "#e6ebf5",
  primaryBorderColor: "#3a4a6e",
  lineColor: "#7c9cff",
  secondaryColor: "#252b3d",
  tertiaryColor: "#1f2535",
  mainBkg: "#1a2030",
  secondBkg: "#252b3d",
  clusterBkg: "#0f1320",
  clusterBorder: "#2a3247",
  edgeLabelBackground: "#0b0d12",
  fontSize: "14px",
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
};

const lightVars = {
  darkMode: false,
  background: "#fafbfd",
  primaryColor: "#e8ecf3",
  primaryTextColor: "#1a2236",
  primaryBorderColor: "#9aa6c2",
  lineColor: "#3b5cf5",
  secondaryColor: "#dde4f0",
  tertiaryColor: "#eef2f8",
  mainBkg: "#e8ecf3",
  secondBkg: "#dde4f0",
  clusterBkg: "#f4f6fa",
  clusterBorder: "#c0cadc",
  edgeLabelBackground: "#fafbfd",
  fontSize: "14px",
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
};

export function initMermaid(theme: ThemeMode) {
  if (currentTheme === theme) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    themeVariables: theme === "dark" ? darkVars : lightVars,
    flowchart: {
      curve: "basis",
      htmlLabels: true,
      nodeSpacing: 50,
      rankSpacing: 60,
      padding: 12,
    },
    securityLevel: "loose",
  });
  currentTheme = theme;
}

export async function renderMermaid(
  id: string,
  source: string,
  theme: ThemeMode,
): Promise<string> {
  initMermaid(theme);
  const { svg } = await mermaid.render(id, source);
  return svg;
}
