import { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  RefreshControl,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import {
  parseContent,
  SOURCES,
  type SourceId,
  type Pattern,
} from "@drilly/parser";
import { loadSource, refreshSource } from "../lib/content";
import {
  setLastRefreshed,
  getLastRefreshed,
  formatRelativeTime,
} from "../lib/storage";

interface Props {
  sourceId: SourceId;
}

export function ItemList({ sourceId }: Props) {
  const [items, setItems] = useState<Pattern[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshLabel, setLastRefreshLabel] = useState<string | null>(null);

  const cfg = SOURCES[sourceId];

  const updateRefreshLabel = useCallback(async () => {
    const ts = await getLastRefreshed(sourceId);
    setLastRefreshLabel(ts ? formatRelativeTime(ts) : null);
  }, [sourceId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const md = await loadSource(sourceId);
        if (cancelled) return;
        setItems(parseContent(md, cfg));
        await updateRefreshLabel();
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceId, cfg, updateRefreshLabel]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const md = await refreshSource(sourceId);
      setItems(parseContent(md, cfg));
      await setLastRefreshed(sourceId, Date.now());
      await updateRefreshLabel();
    } catch (e) {
      setError(`Couldn't reach server — using cached version. ${e}`);
    } finally {
      setRefreshing(false);
    }
  }, [sourceId, cfg, updateRefreshLabel]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#7c9cff"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{cfg.title}</Text>
        <Text style={styles.headerSub}>
          {items.length} {cfg.itemsPlural}
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
          onPress={() => router.push(`/reader/${sourceId}/${item.id}`)}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d12" },
  content: { paddingBottom: 24 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#232938",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
  },
  headerSub: {
    color: "#8a93a6",
    fontSize: 13,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: "#3a2625",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#7a3b3a",
  },
  errorText: { color: "#fbbf24", fontSize: 13 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#161a23",
  },
  itemPressed: { backgroundColor: "#161a23" },
  itemNumber: {
    color: "#8a93a6",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    width: 40,
    textAlign: "right",
  },
  itemTitle: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "500",
  },
  itemMeta: {
    color: "#8a93a6",
    fontSize: 12,
  },
  footer: { height: 24 },
});
