import { useLocalSearchParams, Stack } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useMemo } from "react";
import { ItemList } from "../../components/ItemList";
import { useSource, useManifest } from "../../lib/manifest";
import { useTheme, type Palette } from "../../lib/theme";

/**
 * Source detail screen — drilled into from the home library. Looks up the
 * SourceConfig from the runtime manifest and hands it to <ItemList>.
 *
 * The Stack header (configured in app/_layout.tsx) provides the back arrow
 * and the source title; ItemList renders only the meta sub-line + items.
 */
export default function SourceScreen() {
  const palette = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const params = useLocalSearchParams<{ id: string }>();
  const sourceId = params.id ?? "";

  const source = useSource(sourceId);
  const { ready } = useManifest();

  if (!source) {
    if (!ready) {
      return <View style={styles.center} />;
    }
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          Unknown source “{sourceId}”. Pull to refresh on the home library.
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: source.title }} />
      <ItemList source={source} />
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
      paddingHorizontal: 24,
    },
    error: {
      color: p.errorFg,
      fontSize: 14,
      textAlign: "center",
    },
  });
}
