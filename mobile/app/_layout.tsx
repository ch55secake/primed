import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, View, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SettingsProvider, useSettings } from "../lib/settings";
import { ThemeProvider, useTheme } from "../lib/theme";
import { ManifestProvider } from "../lib/manifest";
import { DesktopSidebar } from "../components/DesktopSidebar";
import { NativeWebViewShell } from "../components/NativeWebViewShell";

/** Width threshold for switching from mobile stack to desktop sidebar layout. */
const DESKTOP_BREAKPOINT_PX = 900;

// Register the offline service worker on web (this is also the code the
// Android WebView runs, so the in-app site gets durable offline caching).
// No-op on native and on browsers without SW support.
if (
  Platform.OS === "web" &&
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator
) {
  const register = () =>
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  if (typeof document !== "undefined" && document.readyState === "complete") {
    register();
  } else if (typeof window !== "undefined") {
    window.addEventListener("load", register);
  }
}

export default function RootLayout() {
  // Native (Android / iOS) is a thin WebView wrapper around the production
  // site. The web build of this same codebase IS the site — keeping a
  // single source of truth instead of maintaining native React Native
  // screens that mirror the web. See components/NativeWebViewShell.tsx.
  if (Platform.OS !== "web") {
    return (
      <SafeAreaProvider>
        <NativeWebViewShell />
      </SafeAreaProvider>
    );
  }

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
  const { layoutMode } = useSettings();
  const { width } = useWindowDimensions();
  // Desktop layout: web only, wide-enough viewport. The sidebar replaces
  // mobile's stack-back-and-forth navigation with persistent lateral nav.
  // The Settings "Layout" override forces it on or off when auto-detection
  // misbehaves; otherwise default is width-based at the 900px breakpoint.
  const autoIsDesktop =
    Platform.OS === "web" && width >= DESKTOP_BREAKPOINT_PX;
  const isDesktop =
    layoutMode === "desktop"
      ? Platform.OS === "web"
      : layoutMode === "mobile"
        ? false
        : autoIsDesktop;
  const anim: "slide_from_right" | "none" = isDesktop
    ? "none"
    : "slide_from_right";

  const stack = (
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
          // ItemList renders its own header chrome on mobile / narrow web
          // and the desktop sidebar covers desktop — so the Stack header
          // never adds anything useful here.
          headerShown: false,
          animation: anim,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
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
  );

  return (
    <>
      <StatusBar style={palette.scheme === "light" ? "dark" : "light"} />
      {isDesktop ? (
        <View style={{ flex: 1, flexDirection: "row", backgroundColor: palette.bg }}>
          <DesktopSidebar />
          <View style={{ flex: 1 }}>{stack}</View>
        </View>
      ) : (
        stack
      )}
    </>
  );
}
