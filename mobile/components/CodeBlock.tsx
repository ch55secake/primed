import { useMemo, type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme, type Palette } from "../lib/theme";
import { useSettings } from "../lib/settings";
import { highlight } from "../lib/syntaxHighlight";
import MermaidView from "./MermaidView";

interface Props {
  /** Fence info string, e.g. "python", "rust", "java", "" if absent. */
  language: string;
  /** Code body, raw (no surrounding triple-backticks). */
  code: string;
}

/**
 * Map common language tags / aliases to a canonical hljs language name.
 * Empty or unknown tags fall back to "" so we render plain (uncoloured)
 * text and label as "Code".
 */
const LANG_ALIAS: Record<string, string> = {
  py: "python",
  rs: "rust",
  ts: "typescript",
  js: "javascript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  cpp: "cpp",
  "c++": "cpp",
  cxx: "cpp",
  cs: "csharp",
  kt: "kotlin",
  rb: "ruby",
};

/** Pretty label for the language pill above each code block. */
const LANG_LABEL: Record<string, string> = {
  python: "Python",
  rust: "Rust",
  typescript: "TypeScript",
  javascript: "JavaScript",
  bash: "Shell",
  yaml: "YAML",
  json: "JSON",
  cpp: "C++",
  csharp: "C#",
  java: "Java",
  kotlin: "Kotlin",
  go: "Go",
  ruby: "Ruby",
  swift: "Swift",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  mermaid: "Diagram",
};

export function CodeBlock({ language, code }: Props) {
  const palette = useTheme();
  const { fontScale } = useSettings();
  const styles = useMemo(
    () => makeStyles(palette, fontScale),
    [palette, fontScale],
  );

  const normalised = (language || "").toLowerCase().trim();
  const canonical = LANG_ALIAS[normalised] ?? normalised;
  const label = canonical ? (LANG_LABEL[canonical] ?? canonical) : "Code";
  const isMermaid = canonical === "mermaid";

  return (
    <View style={styles.wrapper}>
      <View style={styles.tag}>
        <Text style={styles.tagText}>{label}</Text>
      </View>
      {isMermaid ? (
        // Mermaid blocks render inside a WebView with inline HTML that
        // loads mermaid from a CDN, then auto-sizes via postMessage.
        <MermaidView
          source={code}
          scheme={palette.scheme}
          palette={palette}
        />
      ) : (
        <View style={styles.body}>
          {highlight(code, canonical, palette.scheme, {
            color: palette.codeFg,
            fontFamily: "Courier",
            fontSize: 12 * fontScale,
            lineHeight: 18 * fontScale,
          })}
        </View>
      )}
    </View>
  );
}

/**
 * Custom rules object for `react-native-markdown-display` — replaces the
 * default `fence` (triple-backtick code block) renderer with our themed,
 * language-tagged, syntax-highlighted CodeBlock.
 *
 * The library passes the fenced language as `node.sourceInfo` and the code
 * body (without the surrounding fences) as `node.content`.
 */
type FenceNode = {
  key?: string;
  sourceInfo?: string;
  content: string;
};

export const markdownRules = {
  fence: (node: FenceNode): ReactNode => (
    <CodeBlock
      key={node.key}
      language={node.sourceInfo ?? ""}
      code={node.content}
    />
  ),
};

function makeStyles(p: Palette, scale: number) {
  return StyleSheet.create({
    wrapper: {
      marginVertical: 8,
      borderRadius: 6,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: p.border,
    },
    tag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: p.surfacePressed,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
    },
    tagText: {
      color: p.textMuted,
      fontSize: 10 * scale,
      fontWeight: "600",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    body: {
      backgroundColor: p.codeBg,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
  });
}
