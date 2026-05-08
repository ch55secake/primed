import { Slot } from "expo-router";
import { View } from "react-native";
import { SourceTabBar } from "../../components/SourceTabBar";
import { useTheme } from "../../lib/theme";

/**
 * Custom tabs layout: a Slot (renders the active child route) sits above a
 * horizontal-scrollable <SourceTabBar> driven by the runtime manifest.
 *
 * We deliberately don't use expo-router's <Tabs> because the chip count is
 * unbounded — sources can be added remotely via manifest.json without a
 * rebuild, and the stock tab bar squashes labels past ~5 entries.
 */
export default function TabsLayout() {
  const palette = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <SourceTabBar />
    </View>
  );
}
