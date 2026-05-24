import { useEffect, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WebView, type WebViewNavigation } from "react-native-webview";

/**
 * Native Android shell: a single full-screen WebView pointing at the
 * production website. The web build (Expo Web export of this same
 * codebase) IS the app — the native side is just a cache-friendly
 * wrapper so the same UX shows up on the Boox and there's no native
 * code to maintain alongside the web.
 *
 * Cache mode `LOAD_CACHE_ELSE_NETWORK` serves cached responses when
 * present and falls through to network otherwise. First launch needs
 * online; subsequent launches work offline as long as the user has
 * recently visited the relevant pages.
 *
 * Android back button: navigate WebView history first, only exit the
 * app once we're at the WebView's root.
 */

const REMOTE_URL = "https://drilly-delta-brown.vercel.app";

/** Matches the dark theme's `bg` colour so the splash + safe-area flush. */
const BG = "#0b0d12";

export function NativeWebViewShell() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // Android hardware back button. Return true to consume; false lets the
  // OS handle it (which exits the app from the root screen).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <WebView
          ref={webRef}
          source={{ uri: REMOTE_URL }}
          style={styles.web}
          // The page registers a service worker that owns offline caching
          // via durable Cache Storage (the WebView HTTP cache was unreliable
          // — evicted under memory pressure). Leave the WebView cache at its
          // default and let the SW be the source of truth.
          cacheEnabled
          cacheMode="LOAD_DEFAULT"
          javaScriptEnabled
          domStorageEnabled
          pullToRefreshEnabled
          setSupportMultipleWindows={false}
          // Block the WebView from navigating away from our origin.
          // Anything off-host opens in the system browser instead.
          onShouldStartLoadWithRequest={(req) => {
            try {
              const u = new URL(req.url);
              const home = new URL(REMOTE_URL);
              return u.host === home.host;
            } catch {
              return true;
            }
          }}
          onNavigationStateChange={(nav: WebViewNavigation) => {
            setCanGoBack(nav.canGoBack);
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1, backgroundColor: BG },
  web: { flex: 1, backgroundColor: BG },
});
