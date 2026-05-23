import { useMemo } from "react";
import {
  Platform,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SourceLibrary } from "../components/SourceLibrary";
import { useTheme, type Palette } from "../lib/theme";

const DESKTOP_BREAKPOINT_PX = 900;

/**
 * App home.
 *
 * Mobile / narrow web: vertical SourceLibrary card list.
 * Desktop web: minimal welcome — the sidebar already shows every source,
 * so we just nudge the user to pick one (and surface settings / refresh
 * indirectly via the sidebar's icons).
 */
export default function Home() {
  const palette = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const isDesktop = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT_PX;

  if (!isDesktop) {
    return <SourceLibrary />;
  }

  return (
    <View style={styles.welcomeRoot}>
      <Text style={styles.brand}>DRILLY</Text>
      <Text style={styles.hint}>
        Pick a source from the sidebar to start drilling.
      </Text>
    </View>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    welcomeRoot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 48,
      backgroundColor: p.bg,
    },
    brand: {
      color: p.textStrong,
      fontSize: 48,
      fontWeight: "800",
      letterSpacing: 4,
      marginBottom: 16,
    },
    hint: {
      color: p.textMuted,
      fontSize: 16,
      textAlign: "center",
      maxWidth: 360,
    },
  });
}
