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
import { useTheme, type Palette } from "../lib/theme";
import { SourceCard } from "./SourceCard";

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
        <View>
          <Text style={styles.brand}>DRILLY</Text>
          <Text style={styles.brandSub}>
            {sources.length} {sources.length === 1 ? "source" : "sources"}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/settings")}
          style={styles.cog}
          accessibilityLabel="Settings"
        >
          <Text style={styles.cogText}>⚙</Text>
        </Pressable>
      </View>

      {sources.map((s) => (
        <SourceCard
          key={s.id}
          source={s}
          onPress={() => router.push(`/source/${s.id}`)}
        />
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
    footer: { height: 32 },
  });
}
