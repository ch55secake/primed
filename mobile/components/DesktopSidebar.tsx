import { useCallback, useEffect, useMemo, useState } from "react";
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
import { refreshSource, warmExternalCaches } from "../lib/content";
import {
  formatRelativeTime,
  getLastFullRefresh,
  setLastFullRefresh,
  setLastRefreshed,
} from "../lib/storage";
import type { SourceConfig } from "../lib/parser";
import { invalidateSourceItemsCache, useSourceItems } from "../lib/useSourceItems";
import { useTheme, type Palette } from "../lib/theme";

const SIDEBAR_WIDTH = 280;

/**
 * Group sources by their `category` field while preserving manifest order.
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
  return order.map((c) => ({ category: c, sources: buckets.get(c)! }));
}

/**
 * Persistent left sidebar on desktop web (see _layout.tsx).
 *
 * Tree:
 *   CATEGORY
 *     ▸ Source        (collapsed)
 *     ▾ Source        (expanded)
 *         1. Item
 *         2. Item
 *         …
 *
 * Source expansion is local sidebar state; the active source's tree
 * auto-opens when the URL points at one of its items.
 */
export function DesktopSidebar() {
  const palette = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { sources, refresh } = useManifest();
  const grouped = useMemo(() => groupByCategory(sources), [sources]);
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [refreshedLabel, setRefreshedLabel] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  /**
   * Collapsed category names. Start empty (everything expanded) so a fresh
   * visit shows the full tree; the user collapses what they don't care
   * about.
   */
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    () => new Set(),
  );

  // Hydrate the "Updated …" label.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ts = await getLastFullRefresh();
      if (!cancelled) setRefreshedLabel(ts ? formatRelativeTime(ts) : null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // URL parsing: matches both /source/[id] and /reader/[source]/[itemId].
  const { activeSourceId, activeItemId } = useMemo(() => {
    const m = pathname.match(/^\/(?:source|reader)\/([^/]+)(?:\/(\d+))?/);
    return {
      activeSourceId: m ? m[1] : null,
      activeItemId: m && m[2] ? Number(m[2]) : null,
    };
  }, [pathname]);

  // Auto-expand the source tree whenever the URL points at one of its items.
  useEffect(() => {
    if (!activeSourceId) return;
    setExpanded((prev) => {
      if (prev.has(activeSourceId)) return prev;
      const next = new Set(prev);
      next.add(activeSourceId);
      return next;
    });
  }, [activeSourceId]);

  const toggleSource = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const onRefresh = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await Promise.all([
        refresh().catch(() => {}),
        ...sources.map((s) => refreshSource(s).catch(() => {})),
        warmExternalCaches(),
      ]);
      invalidateSourceItemsCache(); // re-parse on next expand
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
        {grouped.map(({ category, sources: groupSources }) => {
          const collapsed = collapsedCategories.has(category);
          return (
            <View key={category} style={styles.group}>
              <Pressable
                onPress={() => toggleCategory(category)}
                style={({ pressed }) => [
                  styles.groupHeaderRow,
                  pressed && styles.sourceRowPressed,
                ]}
                accessibilityLabel={`${collapsed ? "Expand" : "Collapse"} ${category}`}
              >
                <Text style={styles.groupToggle}>{collapsed ? "▸" : "▾"}</Text>
                <Text style={styles.groupHeader}>{category}</Text>
              </Pressable>
              {!collapsed &&
                groupSources.map((s) => (
                  <SourceTreeNode
                    key={s.id}
                    source={s}
                    expanded={expanded.has(s.id)}
                    onToggle={() => toggleSource(s.id)}
                    activeSourceId={activeSourceId}
                    activeItemId={activeItemId}
                    palette={palette}
                  />
                ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface SourceTreeNodeProps {
  source: SourceConfig;
  expanded: boolean;
  onToggle: () => void;
  activeSourceId: string | null;
  activeItemId: number | null;
  palette: Palette;
}

function SourceTreeNode({
  source,
  expanded,
  onToggle,
  activeSourceId,
  activeItemId,
  palette,
}: SourceTreeNodeProps) {
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const items = useSourceItems(source, expanded);
  const active = source.id === activeSourceId;

  return (
    <View>
      <Pressable
        onPress={onToggle}
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
        <Text style={styles.toggleGlyph}>{expanded ? "▾" : "▸"}</Text>
        <Text
          style={[styles.sourceTitle, active && styles.sourceTitleActive]}
          numberOfLines={1}
        >
          {source.title}
        </Text>
      </Pressable>

      {expanded && (
        <View style={styles.itemsList}>
          {items === null ? (
            <Text style={styles.itemsHint}>Loading…</Text>
          ) : items.length === 0 ? (
            <Text style={styles.itemsHint}>No items</Text>
          ) : (
            items.map((it) => {
              const isActiveItem =
                active && activeItemId !== null && activeItemId === it.id;
              return (
                <Pressable
                  key={it.id}
                  onPress={() => router.push(`/reader/${source.id}/${it.id}`)}
                  style={({ pressed }) => [
                    styles.itemRow,
                    pressed && styles.sourceRowPressed,
                    isActiveItem && styles.sourceRowActive,
                  ]}
                >
                  <Text style={styles.itemNumber}>{it.id}</Text>
                  <Text
                    style={[
                      styles.itemTitle,
                      isActiveItem && styles.sourceTitleActive,
                    ]}
                    numberOfLines={2}
                  >
                    {it.title}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      )}
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
    group: { paddingTop: 4, paddingBottom: 4 },
    groupHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    groupToggle: {
      color: p.textMuted,
      fontSize: 10,
      width: 12,
    },
    groupHeader: {
      color: p.textMuted,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.4,
      textTransform: "uppercase",
      marginLeft: 2,
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
      marginRight: 8,
    },
    toggleGlyph: {
      color: p.textMuted,
      fontSize: 12,
      width: 14,
      textAlign: "center",
    },
    sourceTitle: {
      color: p.text,
      fontSize: 14,
      fontWeight: "500",
      flex: 1,
      marginLeft: 2,
    },
    sourceTitleActive: {
      color: p.textStrong,
      fontWeight: "600",
    },
    itemsList: { paddingLeft: 28, paddingBottom: 4 },
    itemsHint: {
      color: p.textMuted,
      fontSize: 12,
      paddingHorizontal: 16,
      paddingVertical: 6,
      fontStyle: "italic",
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 5,
      paddingHorizontal: 8,
      gap: 8,
    },
    itemNumber: {
      color: p.textMuted,
      fontSize: 11,
      fontVariant: ["tabular-nums"],
      width: 22,
      textAlign: "right",
      marginTop: 1,
    },
    itemTitle: {
      color: p.text,
      fontSize: 12,
      lineHeight: 16,
      flex: 1,
    },
  });
}

export const DESKTOP_SIDEBAR_WIDTH = SIDEBAR_WIDTH;
