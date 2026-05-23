import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Platform,
  ScrollView,
  RefreshControl,
  Pressable,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { parseContent, type SourceConfig, type Pattern } from "../lib/parser";
import { loadSource, refreshSource } from "../lib/content";
import { useManifest } from "../lib/manifest";
import {
  setLastRefreshed,
  getLastRefreshed,
  setItemCount,
  formatRelativeTime,
} from "../lib/storage";
import { useTheme, type Palette } from "../lib/theme";

interface Props {
  source: SourceConfig;
}

export function ItemList({ source }: Props) {
  const palette = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { refresh: refreshManifest } = useManifest();
  const { width } = useWindowDimensions();
  // On native and narrow-web the Stack header is missing a back arrow on
  // web (react-native-web doesn't render expo-router's gesture-based
  // back). Show our own header chrome so the user can always navigate
  // up; suppress it on desktop web where the sidebar already provides
  // lateral navigation.
  const showOwnHeader = !(Platform.OS === "web" && width >= 900);

  const [items, setItems] = useState<Pattern[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshLabel, setLastRefreshLabel] = useState<string | null>(null);

  const updateRefreshLabel = useCallback(async () => {
    const ts = await getLastRefreshed(source.id);
    setLastRefreshLabel(ts ? formatRelativeTime(ts) : null);
  }, [source.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const md = await loadSource(source);
        if (cancelled) return;
        const parsed = parseContent(md, source);
        setItems(parsed);
        // Cache the count so the home library can render the meta line
        // without re-parsing markdown for every source card.
        await setItemCount(source.id, parsed.length);
        await updateRefreshLabel();
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, updateRefreshLabel]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      // Refresh the manifest first so a new source published since the
      // last open shows up in the home library on this same pull.
      await refreshManifest().catch(() => {});
      const md = await refreshSource(source);
      const parsed = parseContent(md, source);
      setItems(parsed);
      await setItemCount(source.id, parsed.length);
      await setLastRefreshed(source.id, Date.now());
      await updateRefreshLabel();
    } catch (e) {
      setError(`Couldn't reach server — using cached version. ${e}`);
    } finally {
      setRefreshing(false);
    }
  }, [source, updateRefreshLabel, refreshManifest]);

  return (
    <View style={styles.container}>
      {showOwnHeader && (
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push("/")}
            style={styles.backButton}
            accessibilityLabel="Back to library"
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {source.title}
            </Text>
          </View>
        </View>
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.accent}
          />
        }
      >
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {items.length} {source.itemsPlural}
          {lastRefreshLabel ? ` · updated ${lastRefreshLabel}` : ""}
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {items.map((item) => (
        <Pressable
          key={item.id}
          style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          onPress={() => router.push(`/reader/${source.id}/${item.id}`)}
        >
          <Text style={styles.itemNumber}>{item.id}</Text>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.itemMeta}>
            {item.sections.length} sections
          </Text>
        </Pressable>
      ))}

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: p.bg },
    scroll: { flex: 1 },
    content: { paddingBottom: 24 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      height: 56,
      paddingHorizontal: 12,
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
    headerTitleBlock: { flex: 1, marginLeft: 4 },
    headerTitle: {
      color: p.textStrong,
      fontSize: 17,
      fontWeight: "600",
    },
    metaRow: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    metaText: {
      color: p.textMuted,
      fontSize: 12,
    },
    errorBanner: {
      backgroundColor: p.errorBg,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: p.errorBorder,
    },
    errorText: { color: p.errorFg, fontSize: 13 },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: p.surfacePressed,
    },
    itemPressed: { backgroundColor: p.surfacePressed },
    itemNumber: {
      color: p.textMuted,
      fontSize: 14,
      fontVariant: ["tabular-nums"],
      width: 40,
      textAlign: "right",
    },
    itemTitle: {
      flex: 1,
      color: p.textStrong,
      fontSize: 15,
      fontWeight: "500",
    },
    itemMeta: {
      color: p.textMuted,
      fontSize: 12,
    },
    footer: { height: 24 },
  });
}
