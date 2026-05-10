import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { Pattern, SourceConfig } from "../lib/parser";
import { useTheme, type Palette } from "../lib/theme";

interface Props {
  item: Pattern;
  source: SourceConfig;
}

/**
 * Build a Markdown serialisation of an entire item — title heading plus
 * one `## Section` block per parsed section. Designed to paste straight
 * into Claude / ChatGPT / a notes app for follow-up questions.
 */
function buildCopy(item: Pattern, source: SourceConfig): string {
  const lines: string[] = [
    `# ${source.itemLabel} ${item.id}: ${item.title}`,
    "",
  ];
  for (const s of item.sections) {
    lines.push(`## ${s.name}`);
    lines.push("");
    lines.push(s.content.trim());
    lines.push("");
  }
  return lines.join("\n").trim() + "\n";
}

/**
 * Reader-header action: tap to copy the entire current item to the
 * system clipboard. Icon flips to a check for ~1.5s as confirmation.
 */
export function CopyButton({ item, source }: Props) {
  const palette = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [copied, setCopied] = useState(false);

  const onPress = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(buildCopy(item, source));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write can fail on rare platforms — silently no-op,
      // user will notice the missing feedback and try again.
    }
  }, [item, source]);

  return (
    <Pressable
      onPress={onPress}
      style={styles.button}
      accessibilityLabel="Copy item to clipboard"
      accessibilityHint="Copies the title and every section as Markdown"
    >
      <Text style={styles.glyph}>{copied ? "✓" : "⧉"}</Text>
    </Pressable>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    button: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    glyph: {
      color: p.accent,
      fontSize: 20,
    },
  });
}
