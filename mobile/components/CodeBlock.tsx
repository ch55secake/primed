import { useMemo, type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme, type Palette } from "../lib/theme";

interface Props {
  /** Fence info string, e.g. "python", "rust", "java", "" if absent. */
  language: string;
  /** Code body, raw (no surrounding triple-backticks). */
  code: string;
}

/**
 * Map common language tags / aliases to a canonical lookup key. Empty or
 * unknown tags fall back to "code" so the label is never blank.
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
};

export function CodeBlock({ language, code }: Props) {
  const palette = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const normalised = (language || "").toLowerCase().trim();
  const canonical = LANG_ALIAS[normalised] ?? normalised;
  const label = canonical ? (LANG_LABEL[canonical] ?? canonical) : "Code";

  return (
    <View style={styles.wrapper}>
      <View style={styles.tag}>
        <Text style={styles.tagText}>{label}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.code} selectable>
          {code.replace(/\n$/, "")}
        </Text>
      </View>
    </View>
  );
}

/**
 * Custom rules object for `react-native-markdown-display` — replaces the
 * default `fence` (triple-backtick code block) renderer with our themed,
 * language-tagged CodeBlock.
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

function makeStyles(p: Palette) {
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
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    body: {
      backgroundColor: p.codeBg,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    code: {
      color: p.codeFg,
      fontFamily: "Courier",
      fontSize: 12,
      lineHeight: 18,
    },
  });
}
