import { useCallback, useMemo, useState } from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import type { SourceConfig } from "../lib/parser";
import {
  getItemCount,
  getProgressCount,
  getLastRefreshed,
  formatRelativeTime,
} from "../lib/storage";
import { useTheme, type Palette } from "../lib/theme";

interface Props {
  source: SourceConfig;
  onPress: () => void;
}

interface CardMeta {
  count: number | null;
  progress: number | null;
  updated: string | null;
}

const EMPTY_META: CardMeta = { count: null, progress: null, updated: null };

/**
 * One row in the home library. Renders cheaply from AsyncStorage — no
 * markdown parsing happens here, so the home screen stays snappy with
 * many sources. Metadata back-fills as ItemList runs and persists counts.
 */
export function SourceCard({ source, onPress }: Props) {
  const palette = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [meta, setMeta] = useState<CardMeta>(EMPTY_META);

  // Re-load metadata each time the home screen regains focus — the user
  // may have just opened this source and bumped its progress count, so
  // the card needs to reflect that without forcing a full unmount.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [count, progress, refreshedAt] = await Promise.all([
          getItemCount(source.id),
          getProgressCount(source.id),
          getLastRefreshed(source.id),
        ]);
        if (cancelled) return;
        setMeta({
          count,
          progress,
          updated: refreshedAt ? formatRelativeTime(refreshedAt) : null,
        });
      })();
      return () => {
        cancelled = true;
      };
    }, [source.id]),
  );

  const subline = buildSubline(source, meta);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.accent} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {source.title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {subline}
        </Text>
      </View>
    </Pressable>
  );
}

function buildSubline(source: SourceConfig, meta: CardMeta): string {
  const parts: string[] = [];

  if (meta.count !== null) {
    parts.push(`${meta.count} ${source.itemsPlural}`);
  } else {
    parts.push(source.itemsPlural);
  }

  if (meta.count && meta.progress !== null) {
    const pct = Math.round((meta.progress / meta.count) * 100);
    parts.push(`${pct}% read`);
  }

  if (meta.updated) {
    parts.push(`updated ${meta.updated}`);
  }

  return parts.join(" · ");
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "stretch",
      backgroundColor: p.bg,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
    },
    rowPressed: { backgroundColor: p.surfacePressed },
    accent: {
      width: 3,
      backgroundColor: p.accent,
    },
    body: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 14,
    },
    title: {
      color: p.textStrong,
      fontSize: 17,
      fontWeight: "600",
    },
    sub: {
      color: p.textMuted,
      fontSize: 12,
      marginTop: 4,
    },
  });
}
