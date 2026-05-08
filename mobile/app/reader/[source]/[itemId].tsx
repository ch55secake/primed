import { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { parseContent, type Pattern } from "../../../lib/parser";
import { loadSource } from "../../../lib/content";
import { Reader } from "../../../components/Reader";
import { useSource } from "../../../lib/manifest";
import { useTheme, type Palette } from "../../../lib/theme";

export default function ReaderScreen() {
  const palette = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const params = useLocalSearchParams<{ source: string; itemId: string }>();
  const sourceId = params.source ?? "";
  const itemId = Number(params.itemId);
  const source = useSource(sourceId);

  const [items, setItems] = useState<Pattern[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    (async () => {
      try {
        const md = await loadSource(source);
        if (cancelled) return;
        setItems(parseContent(md, source));
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

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

  if (!source) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Unknown source “{sourceId}”</Text>
      </View>
    );
  }

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
        <ActivityIndicator color={palette.accent} />
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
      <Reader source={source} item={item} onNeighbourItem={onNeighbourItem} />
    </>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: p.bg,
    },
    error: {
      color: p.errorFg,
      fontSize: 14,
      paddingHorizontal: 24,
      textAlign: "center",
    },
  });
}
