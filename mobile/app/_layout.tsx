import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SettingsProvider, useSettings } from "../lib/settings";
import { ThemeProvider, useTheme } from "../lib/theme";
import { ManifestProvider } from "../lib/manifest";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeProvider>
            <ManifestProvider>
              <ThemedRoot />
            </ManifestProvider>
          </ThemeProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Inside the providers so <StatusBar> can react to the theme palette.
 */
function ThemedRoot() {
  const palette = useTheme();
  const { eInkMode } = useSettings();
  // E-ink panels can't render slide transitions cleanly — every animation
  // frame leaves a ghost trail. Disable Stack screen animations entirely
  // while e-ink mode is on; pushes/pops become single-refresh state swaps.
  const anim: "slide_from_right" | "none" = eInkMode ? "none" : "slide_from_right";
  return (
    <>
      <StatusBar style={palette.scheme === "light" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: palette.surface },
          headerTintColor: palette.textStrong,
          headerTitleStyle: { color: palette.textStrong },
          contentStyle: { backgroundColor: palette.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="source/[id]"
          options={{
            headerShown: true,
            headerBackTitle: "Library",
            animation: anim,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            title: "Settings",
            headerBackTitle: "Library",
            animation: anim,
          }}
        />
        <Stack.Screen
          name="reader/[source]/[itemId]"
          options={{
            headerShown: false,
            animation: anim,
          }}
        />
      </Stack>
    </>
  );
}
