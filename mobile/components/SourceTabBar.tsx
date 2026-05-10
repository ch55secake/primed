import { useMemo } from "react";
import {
  ScrollView,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { useManifest } from "../lib/manifest";
import { useTheme, type Palette } from "../lib/theme";

/**
 * Bottom navigation bar — horizontal-scrollable strip of source chips +
 * a permanent Settings chip on the right.
 *
 * Replaces expo-router's stock <Tabs> so the strip can grow without cramping.
 */
export function SourceTabBar() {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const { sources } = useManifest();
  const pathname = usePathname();

  // pathname looks like "/patterns" or "/settings" — the (tabs) group is
  // hidden in the URL, so we just match against the trailing segment.
  const activeId = pathname.replace(/^\//, "").split("/")[0] || sources[0]?.id;

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {sources.map((s) => {
          const active = s.id === activeId;
          return (
            <Pressable
              key={s.id}
              onPress={() => router.replace(`/${s.id}` as never)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {s.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        onPress={() => router.replace("/settings" as never)}
        style={[
          styles.settingsChip,
          activeId === "settings" && styles.chipActive,
        ]}
        accessibilityLabel="Settings"
      >
        <Text
          style={[
            styles.chipText,
            activeId === "settings" && styles.chipTextActive,
          ]}
        >
          ⚙
        </Text>
      </Pressable>
    </View>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    bar: {
      flexDirection: "row",
      alignItems: "stretch",
      backgroundColor: p.surface,
      borderTopWidth: 1,
      borderTopColor: p.border,
    },
    scroll: {
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 6,
      alignItems: "center",
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: "transparent",
      marginRight: 6,
    },
    chipActive: {
      backgroundColor: p.accent,
    },
    chipText: {
      color: p.textMuted,
      fontSize: 13,
      fontWeight: "500",
    },
    chipTextActive: {
      color: p.scheme === "light" ? "#ffffff" : "#0b0d12",
      fontWeight: "600",
    },
    settingsChip: {
      paddingHorizontal: 14,
      justifyContent: "center",
      alignItems: "center",
      borderLeftWidth: 1,
      borderLeftColor: p.border,
      marginVertical: 8,
    },
  });
}
