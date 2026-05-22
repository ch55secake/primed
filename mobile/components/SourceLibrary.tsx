import { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  RefreshControl,
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useManifest } from "../lib/manifest";
import type { SourceConfig } from "../lib/parser";
import { useTheme, type Palette } from "../lib/theme";
import { SourceCard } from "./SourceCard";
import { RefreshAllButton } from "./RefreshAllButton";

/**
 * Group manifest sources by their `category` field, preserving manifest
 * order within each group. Sources without a category fall under "Other".
 * Returns an ordered array of (category, sources) so the home library
 * can render category headers + nested cards in a single pass.
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

/**
 * Home screen — vertical list of source cards. Replaces the bottom chip
 * strip; tap a card to drill into that source's items, tap ⚙ to open
 * Settings. Pull-to-refresh refreshes only the manifest (cheap) — content
 * refresh stays on the per-source view.
 */
export function SourceLibrary() {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { sources, refresh } = useManifest();
  const grouped = useMemo(() => groupByCategory(sources), [sources]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch {
      // Manifest refresh is best-effort — bundled fallback keeps the UI alive.
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={palette.accent}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.brand}>DRILLY</Text>
          <Text style={styles.brandSub}>
            {sources.length} {sources.length === 1 ? "source" : "sources"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <RefreshAllButton />
          <Pressable
            onPress={() => router.push("/settings")}
            style={styles.cog}
            accessibilityLabel="Settings"
          >
            <Text style={styles.cogText}>⚙</Text>
          </Pressable>
        </View>
      </View>

      {grouped.map(({ category, sources: groupSources }) => (
        <View key={category} style={styles.group}>
          <Text style={styles.groupHeader}>{category}</Text>
          {groupSources.map((s) => (
            <SourceCard
              key={s.id}
              source={s}
              onPress={() => router.push(`/source/${s.id}`)}
            />
          ))}
        </View>
      ))}

      <View style={styles.footer} />
    </ScrollView>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: p.bg },
    content: { paddingBottom: 32 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
    },
    headerLeft: { flex: 1 },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    brand: {
      color: p.textStrong,
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: 1.5,
    },
    brandSub: {
      color: p.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    cog: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 22,
    },
    cogText: {
      color: p.textMuted,
      fontSize: 22,
    },
    group: {
      marginTop: 12,
    },
    groupHeader: {
      color: p.textMuted,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1.5,
      textTransform: "uppercase",
      paddingHorizontal: 16,
      paddingBottom: 6,
      paddingTop: 12,
    },
    footer: { height: 32 },
  });
}
