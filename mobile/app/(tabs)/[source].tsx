import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useMemo } from "react";
import { ItemList } from "../../components/ItemList";
import { useSource, useManifest } from "../../lib/manifest";
import { useTheme, type Palette } from "../../lib/theme";

/**
 * Dynamic source tab — every chip in <SourceTabBar> routes here with the
 * source id as the [source] param. Looks up the SourceConfig from the
 * runtime manifest and hands it to <ItemList>.
 */
export default function SourceTab() {
  const palette = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const params = useLocalSearchParams<{ source: string }>();
  const sourceId = params.source ?? "";

  const source = useSource(sourceId);
  const { ready } = useManifest();

  if (!source) {
    // While the manifest is still hydrating, render nothing rather than a
    // misleading "Unknown source" — the provider seeds with bundled defaults
    // synchronously, so this is a brief flash on cold start at most.
    if (!ready) {
      return <View style={styles.center} />;
    }
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          Unknown source “{sourceId}”. Pull to refresh on a known tab.
        </Text>
      </View>
    );
  }

  return <ItemList source={source} />;
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: p.bg,
      paddingHorizontal: 24,
    },
    error: {
      color: p.errorFg,
      fontSize: 14,
      textAlign: "center",
    },
  });
}
