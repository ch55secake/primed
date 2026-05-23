import { useCallback, useMemo, useRef, useState } from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useManifest } from "../lib/manifest";
import { refreshSource, warmExternalCaches } from "../lib/content";
import {
  formatRelativeTime,
  getLastFullRefresh,
  setLastFullRefresh,
  setLastRefreshed,
} from "../lib/storage";
import { useTheme, type Palette } from "../lib/theme";

/**
 * Home-header action: refreshes the manifest AND every source's markdown
 * in parallel. Shows a "Updated {relative}" label below the spinning icon
 * so the user can see at a glance when the library last reloaded.
 *
 * Each per-source `refreshSource` is wrapped in `.catch(() => {})` so a
 * single failing source (e.g. a 404 on a stale manifest entry) doesn't
 * abort the others. The final timestamp is only written once the whole
 * sweep settles.
 */
export function RefreshAllButton() {
  const palette = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { sources, refresh: refreshManifest } = useManifest();
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const spin = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Re-hydrate label when the home screen regains focus (e.g. after the
  // user toggled a setting and bounced back).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const ts = await getLastFullRefresh();
        if (!cancelled) {
          setLabel(ts ? formatRelativeTime(ts) : null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const onPress = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    spin.setValue(0);
    loopRef.current = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loopRef.current.start();

    try {
      await Promise.all([
        refreshManifest().catch(() => {}),
        ...sources.map((s) => refreshSource(s).catch(() => {})),
        warmExternalCaches(),
      ]);
      const now = Date.now();
      await setLastFullRefresh(now);
      // Bring per-source labels in sync so the SourceCards' "updated Xh ago"
      // sublines match the global timestamp until the user refreshes one
      // individually again.
      await Promise.all(sources.map((s) => setLastRefreshed(s.id, now)));
      setLabel(formatRelativeTime(now));
    } finally {
      loopRef.current?.stop();
      loopRef.current = null;
      spin.setValue(0);
      setBusy(false);
    }
  }, [busy, sources, refreshManifest, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
      accessibilityLabel="Refresh all sources"
      accessibilityHint={
        label
          ? `Library was last refreshed ${label}. Tap to refresh now.`
          : "Tap to refresh the manifest and every source."
      }
    >
      <Animated.Text style={[styles.glyph, { transform: [{ rotate }] }]}>
        ↻
      </Animated.Text>
      <View style={styles.labelWrap}>
        <Text style={styles.label} numberOfLines={1}>
          {busy ? "Refreshing…" : label ? `Updated ${label}` : "Never refreshed"}
        </Text>
      </View>
    </Pressable>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    wrapper: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
      paddingVertical: 4,
      maxWidth: 130,
    },
    pressed: { opacity: 0.6 },
    glyph: {
      color: p.textMuted,
      fontSize: 22,
      lineHeight: 26,
    },
    labelWrap: { marginTop: 2 },
    label: {
      color: p.textMuted,
      fontSize: 10,
      letterSpacing: 0.3,
    },
  });
}
