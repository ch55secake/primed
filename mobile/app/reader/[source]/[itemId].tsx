import { useEffect, useState, useCallback } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import {
  parseContent,
  SOURCES,
  type Pattern,
  type SourceId,
} from "@drilly/parser";
import { loadSource } from "../../../lib/content";
import { Reader } from "../../../components/Reader";

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ source: string; itemId: string }>();
  const sourceId = params.source as SourceId;
  const itemId = Number(params.itemId);

  const [items, setItems] = useState<Pattern[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const md = await loadSource(sourceId);
        if (cancelled) return;
        setItems(parseContent(md, SOURCES[sourceId]));
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  const onNeighbourItem = useCallback(
    (delta: 1 | -1) => {
      if (!items) return;
      const idx = items.findIndex((it) => it.id === itemId);
      const target = items[idx + delta];
      if (target) {
        router.replace(`/reader/${sourceId}/${target.id}`);
      }
    },
    [items, itemId, sourceId],
  );

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!items) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7c9cff" />
      </View>
    );
  }

  const item = items.find((it) => it.id === itemId);
  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Item {itemId} not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Reader source={SOURCES[sourceId]} item={item} onNeighbourItem={onNeighbourItem} />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b0d12",
  },
  error: {
    color: "#fbbf24",
    fontSize: 14,
    paddingHorizontal: 24,
    textAlign: "center",
  },
});
