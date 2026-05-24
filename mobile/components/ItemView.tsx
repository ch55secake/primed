import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import Markdown from "react-native-markdown-display";
import { sortSections, type Pattern, type SourceConfig } from "../lib/parser";
import {
  getRevealedSections,
  setRevealedSections,
} from "../lib/storage";
import { useSettings } from "../lib/settings";
import { useTheme, type Palette } from "../lib/theme";
import { markdownRules } from "./CodeBlock";
import { CopyButton } from "./CopyButton";

interface Props {
  source: SourceConfig;
  item: Pattern;
  /** Adjacent-item navigation (per-source "prev / next problem"). */
  onNeighbourItem: (delta: 1 | -1) => void;
}

/**
 * Reveal-on-tap reader. Replaces the previous paginated PagerView with
 * the simpler "section cards" UX from the old web app: each section is a
 * collapsible card with a tap-to-toggle header. Default-revealed sections
 * (see `SourceConfig.defaultRevealedSections`) expand on first open;
 * everything else stays hidden until the user taps to reveal — useful for
 * studying problems where you want to read the prompt first and force
 * yourself to think before peeking at the answer.
 */
export function ItemView({ source, item, onNeighbourItem }: Props) {
  const palette = useTheme();
  const router = useRouter();
  const settings = useSettings();
  const styles = useMemo(
    () => makeStyles(palette, settings.eReaderMode),
    [palette, settings.eReaderMode],
  );
  const markdownStyles = useMemo(
    () => makeMarkdownStyles(palette, settings.fontScale),
    [palette, settings.fontScale],
  );

  const sortedSections = useMemo(
    () => sortSections(item.sections, source.sectionOrder),
    [item, source],
  );

  // revealed = set of section names currently expanded. Hydrated from
  // AsyncStorage on mount; falls back to source.defaultRevealedSections.
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await getRevealedSections(source.id, item.id);
      if (cancelled) return;
      if (saved.length > 0) {
        setRevealed(new Set(saved));
      } else {
        // No saved state — seed from manifest defaults, plus the Summary
        // card if the user has the auto-reveal setting on AND this item
        // actually has a section named "Summary". Per-item toggles always
        // win after first visit (they take the `saved.length > 0` branch).
        const initial = new Set(source.defaultRevealedSections);
        if (
          settings.autoRevealSummary &&
          sortedSections.some((s) => s.name === "Summary")
        ) {
          initial.add("Summary");
        }
        setRevealed(initial);
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    source.id,
    source.defaultRevealedSections,
    item.id,
    settings.autoRevealSummary,
    sortedSections,
  ]);

  // Persist on every change (after hydration so we don't overwrite saved
  // state with the initial empty set on mount).
  useEffect(() => {
    if (!hydrated) return;
    setRevealedSections(source.id, item.id, Array.from(revealed));
  }, [hydrated, source.id, item.id, revealed]);

  const toggle = useCallback(
    (name: string) => {
      setRevealed((prev) => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        return next;
      });
    },
    [],
  );

  const showAll = useCallback(() => {
    setRevealed(new Set(sortedSections.map((s) => s.name)));
  }, [sortedSections]);

  const hideAll = useCallback(() => {
    setRevealed(new Set());
  }, []);

  const revealNext = useCallback(() => {
    const next = sortedSections.find((s) => !revealed.has(s.name));
    if (!next) return;
    setRevealed((prev) => {
      const n = new Set(prev);
      n.add(next.name);
      return n;
    });
  }, [sortedSections, revealed]);

  // Web-only keyboard shortcuts. Space reveals the next hidden section in
  // order — mirrors the old web's study-mode flow. Esc collapses everything.
  // Disabled inside text inputs so a user typing somewhere isn't hijacked.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof document === "undefined") return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches?.("input, textarea, [contenteditable='true']")) return;
      if (e.code === "Space") {
        e.preventDefault();
        revealNext();
      } else if (e.code === "Escape") {
        e.preventDefault();
        hideAll();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [revealNext, hideAll]);

  const allRevealed =
    revealed.size > 0 && revealed.size === sortedSections.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push(`/source/${source.id}`)}
          style={styles.backButton}
          accessibilityLabel={`Back to ${source.title}`}
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <View style={styles.headerTitle}>
          {/* Crumb shows the parent source so the user always knows where
              up goes — tap it to jump to the source's item list. */}
          <Pressable
            onPress={() => router.push(`/source/${source.id}`)}
            accessibilityLabel={`Open ${source.title} list`}
          >
            <Text style={styles.headerCrumb} numberOfLines={1}>
              {source.title.toUpperCase()} · {source.itemLabel} {item.id}
            </Text>
          </Pressable>
          <Text style={styles.headerName} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <CopyButton item={item} source={source} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyInner}
      >
        <View style={styles.controlsRow}>
          <Pressable
            onPress={allRevealed ? hideAll : showAll}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.controlButtonPressed,
            ]}
          >
            <Text style={styles.controlText}>
              {allRevealed ? "Hide all" : "Show all"}
            </Text>
          </Pressable>
          <Text style={styles.progressText}>
            {revealed.size} / {sortedSections.length}
          </Text>
        </View>

        {sortedSections.map((section) => {
          const open = revealed.has(section.name);
          return (
            <View key={section.name} style={styles.sectionCard}>
              <Pressable
                onPress={() => toggle(section.name)}
                style={({ pressed }) => [
                  styles.sectionHeader,
                  pressed && styles.sectionHeaderPressed,
                ]}
              >
                <Text style={styles.sectionToggle}>{open ? "▾" : "▸"}</Text>
                <Text style={styles.sectionName}>{section.name}</Text>
              </Pressable>
              {open && (
                <View style={styles.sectionBody}>
                  <Markdown style={markdownStyles} rules={markdownRules}>
                    {section.content}
                  </Markdown>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.footerNav}>
          <Pressable
            onPress={() => onNeighbourItem(-1)}
            style={styles.footerButton}
          >
            <Text style={styles.footerButtonText}>‹ Previous</Text>
          </Pressable>
          <Pressable
            onPress={() => onNeighbourItem(1)}
            style={styles.footerButton}
          >
            <Text style={styles.footerButtonText}>Next ›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * `eink` toggles the e-reader rendering for the section cards:
 *  - No card border / no surface background (e-ink can't render subtle
 *    chrome crisply; it washes to mid-grey)
 *  - Section header is a flat heading (no card chrome, no press flash)
 *  - High-contrast chevron + label (palette.textStrong, no muted greys)
 *  - Body flows directly under the header with no border-top divider
 * All other UI (top header, footer nav, progress text) stays the same;
 * those are minor surfaces that already look fine on e-ink.
 */
function makeStyles(p: Palette, eink: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: p.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
      backgroundColor: p.surface,
    },
    backButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    backArrow: { color: p.accent, fontSize: 28, lineHeight: 28 },
    headerTitle: { flex: 1, marginLeft: 4 },
    headerLabel: {
      color: p.textMuted,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    headerCrumb: {
      color: p.textMuted,
      fontSize: 11,
      letterSpacing: 1.2,
      fontWeight: "600",
    },
    headerName: { color: p.textStrong, fontSize: 15, fontWeight: "600" },
    body: { flex: 1 },
    bodyInner: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 48 },
    controlsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    controlButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 6,
      backgroundColor: p.surface,
    },
    controlButtonPressed: { backgroundColor: p.surfacePressed },
    controlText: { color: p.text, fontSize: 12, fontWeight: "500" },
    progressText: {
      color: p.textMuted,
      fontSize: 12,
      fontVariant: ["tabular-nums"],
    },
    sectionCard: eink
      ? {
          marginBottom: 4,
          // No border, no rounded chrome, no surface tint — flat layout
          // so the page reads as one continuous document with bold
          // section dividers.
        }
      : {
          marginBottom: 10,
          borderWidth: 1,
          borderColor: p.border,
          borderRadius: 8,
          backgroundColor: p.surface,
          overflow: "hidden",
        },
    sectionHeader: eink
      ? {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 0,
          paddingVertical: 14,
          borderTopWidth: 1,
          borderTopColor: p.text,
        }
      : {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingVertical: 12,
        },
    // E-ink: no press-state background flash (ghosting). Bubble: tinted
    // surfacePressed for the tap affordance.
    sectionHeaderPressed: eink ? {} : { backgroundColor: p.surfacePressed },
    sectionToggle: eink
      ? {
          color: p.textStrong,
          fontSize: 18,
          fontWeight: "700",
          width: 22,
        }
      : {
          color: p.textMuted,
          fontSize: 14,
          width: 18,
        },
    sectionName: eink
      ? {
          color: p.textStrong,
          fontSize: 18,
          fontWeight: "700",
          flex: 1,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }
      : {
          color: p.textStrong,
          fontSize: 15,
          fontWeight: "600",
          flex: 1,
        },
    sectionBody: eink
      ? {
          paddingHorizontal: 0,
          paddingTop: 4,
          paddingBottom: 16,
        }
      : {
          paddingHorizontal: 14,
          paddingBottom: 14,
          borderTopWidth: 1,
          borderTopColor: p.border,
          backgroundColor: p.bg,
        },
    footerNav: {
      marginTop: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    footerButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 8,
      backgroundColor: p.surface,
    },
    footerButtonText: {
      color: p.accent,
      fontSize: 14,
      fontWeight: "500",
    },
  });
}

function makeMarkdownStyles(p: Palette, scale: number) {
  const fs = (n: number) => n * scale;
  return {
    body: { color: p.text, fontSize: fs(15), lineHeight: fs(22) },
    heading1: {
      color: p.textStrong,
      fontSize: fs(20),
      fontWeight: "700" as const,
      marginTop: 12,
      marginBottom: 8,
    },
    heading2: {
      color: p.textStrong,
      fontSize: fs(17),
      fontWeight: "700" as const,
      marginTop: 12,
      marginBottom: 6,
    },
    heading3: {
      color: p.textStrong,
      fontSize: fs(15),
      fontWeight: "600" as const,
      marginTop: 10,
      marginBottom: 4,
    },
    heading4: {
      color: p.textStrong,
      fontSize: fs(14),
      fontWeight: "600" as const,
      marginTop: 8,
      marginBottom: 2,
    },
    strong: { color: p.textStrong },
    em: {
      color: p.scheme === "light" ? "#6845c0" : "#b8a3ff",
      fontStyle: "italic" as const,
    },
    link: { color: p.accent },
    paragraph: { marginTop: 6, marginBottom: 6 },
    list_item: { marginVertical: 2 },
    bullet_list: { marginVertical: 6 },
    ordered_list: { marginVertical: 6 },
    code_inline: {
      backgroundColor: p.codeBg,
      color: p.accent,
      fontFamily: "Courier",
      fontSize: fs(13),
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
    },
    blockquote: {
      backgroundColor: "transparent",
      borderLeftColor: p.accent,
      borderLeftWidth: 3,
      paddingLeft: 12,
      marginVertical: 6,
    },
    table: {
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 6,
      marginVertical: 6,
    },
    th: {
      backgroundColor: p.surfacePressed,
      color: p.textStrong,
      fontWeight: "600" as const,
      padding: 6,
    },
    td: { padding: 6, color: p.text },
    hr: { backgroundColor: p.border, height: 1, marginVertical: 12 },
  };
}
