import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router, usePathname } from "expo-router";
import { useManifest } from "../lib/manifest";
import { refreshSource } from "../lib/content";
import {
  formatRelativeTime,
  getLastFullRefresh,
  setLastFullRefresh,
  setLastRefreshed,
} from "../lib/storage";
import type { SourceConfig } from "../lib/parser";
import { useTheme, type Palette } from "../lib/theme";

const SIDEBAR_WIDTH = 280;

/**
 * Persistent left sidebar shown on desktop web only (see _layout.tsx).
 *
 * Layout:
 *   DRILLY                          ↻  ⚙
 *   {N} sources · Updated 2h ago
 *   ----
 *   SYSTEM DESIGN
 *     • Patterns
 *   DSA
 *     • NeetCode 150
 *   LANGUAGES
 *     • Java
 *     • Kotlin
 *
 * The active source (matched against the URL pathname) gets the accent
 * highlight so the user always sees where they are in the library.
 */
function groupByCategory(
  sources: SourceConfig[],
): Array<{ category: string; sources: SourceConfig[] }> {
  const order: string[] = [];
  const buckets = new Map<string, SourceConfig[]>();
  for (const s of sources) {
    const cat = s.category?.trim() || "Other";
    if (!buckets.has(cat)) {
      order.push(cat);
      buckets.set(cat, []);
    }
    buckets.get(cat)!.push(s);
  }
  return order.map((category) => ({
    category,
    sources: buckets.get(category)!,
  }));
}

export function DesktopSidebar() {
  const palette = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { sources, refresh } = useManifest();
  const grouped = useMemo(() => groupByCategory(sources), [sources]);
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [refreshedLabel, setRefreshedLabel] = useState<string | null>(null);

  // Hydrate the "Updated …" label on every render so it stays fresh after
  // navigation; cheap because getLastFullRefresh is one AsyncStorage read.
  useMemo(() => {
    (async () => {
      const ts = await getLastFullRefresh();
      setRefreshedLabel(ts ? formatRelativeTime(ts) : null);
    })();
  }, []);

  const activeId = useMemo(() => {
    // Pathnames look like "/source/java" or "/reader/java/4" — pick the
    // segment immediately after /source or /reader.
    const m = pathname.match(/^\/(?:source|reader)\/([^/]+)/);
    return m ? m[1] : null;
  }, [pathname]);

  const onRefresh = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await Promise.all([
        refresh().catch(() => {}),
        ...sources.map((s) => refreshSource(s).catch(() => {})),
      ]);
      const now = Date.now();
      await setLastFullRefresh(now);
      await Promise.all(sources.map((s) => setLastRefreshed(s.id, now)));
      setRefreshedLabel(formatRelativeTime(now));
    } finally {
      setBusy(false);
    }
  }, [busy, sources, refresh]);

  return (
    <View style={styles.sidebar}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push("/")}
          style={styles.brandBlock}
          accessibilityLabel="Home"
        >
          <Text style={styles.brand}>DRILLY</Text>
          <Text style={styles.brandSub}>
            {sources.length} {sources.length === 1 ? "source" : "sources"}
            {refreshedLabel ? ` · Updated ${refreshedLabel}` : ""}
          </Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            onPress={onRefresh}
            disabled={busy}
            style={styles.iconButton}
            accessibilityLabel="Refresh all sources"
          >
            {busy ? (
              <ActivityIndicator color={palette.textMuted} size="small" />
            ) : (
              <Text style={styles.iconGlyph}>↻</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings")}
            style={styles.iconButton}
            accessibilityLabel="Settings"
          >
            <Text style={styles.iconGlyph}>⚙</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyInner}>
        {grouped.map(({ category, sources: groupSources }) => (
          <View key={category} style={styles.group}>
            <Text style={styles.groupHeader}>{category}</Text>
            {groupSources.map((s) => {
              const active = s.id === activeId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => router.push(`/source/${s.id}`)}
                  style={({ pressed }) => [
                    styles.sourceRow,
                    pressed && styles.sourceRowPressed,
                    active && styles.sourceRowActive,
                  ]}
                >
                  <View
                    style={[
                      styles.accentStrip,
                      { backgroundColor: active ? palette.accent : "transparent" },
                    ]}
                  />
                  <Text
                    style={[styles.sourceTitle, active && styles.sourceTitleActive]}
                    numberOfLines={1}
                  >
                    {s.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    sidebar: {
      width: SIDEBAR_WIDTH,
      backgroundColor: p.surface,
      borderRightWidth: 1,
      borderRightColor: p.border,
      flexDirection: "column",
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
    },
    brandBlock: { flex: 1, paddingRight: 8 },
    brand: {
      color: p.textStrong,
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: 1.3,
    },
    brandSub: {
      color: p.textMuted,
      fontSize: 11,
      marginTop: 4,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    iconButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
    },
    iconGlyph: {
      color: p.textMuted,
      fontSize: 18,
      lineHeight: 20,
    },
    body: { flex: 1 },
    bodyInner: { paddingVertical: 8 },
    group: { paddingTop: 8, paddingBottom: 4 },
    groupHeader: {
      color: p.textMuted,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.4,
      textTransform: "uppercase",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    sourceRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingRight: 16,
      paddingVertical: 8,
    },
    sourceRowPressed: { backgroundColor: p.surfacePressed },
    sourceRowActive: { backgroundColor: p.surfacePressed },
    accentStrip: {
      width: 3,
      height: 20,
      marginRight: 12,
    },
    sourceTitle: {
      color: p.text,
      fontSize: 14,
      fontWeight: "500",
      flex: 1,
    },
    sourceTitleActive: {
      color: p.textStrong,
      fontWeight: "600",
    },
  });
}

export const DESKTOP_SIDEBAR_WIDTH = SIDEBAR_WIDTH;
