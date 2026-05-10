import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SettingsProvider } from "../lib/settings";
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
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            title: "Settings",
            headerBackTitle: "Library",
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="reader/[source]/[itemId]"
          options={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        />
      </Stack>
    </>
  );
}
