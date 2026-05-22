import { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { Palette } from "../lib/theme";
import { buildHtml } from "./MermaidView";

interface Props {
  visible: boolean;
  onClose: () => void;
  source: string;
  palette: Palette;
  scheme: "dark" | "light";
}

/**
 * Fullscreen pinch-zoom view for a mermaid diagram. Mounted only by the
 * phone profile of MermaidView (e-ink mode skips the modal so the fade-in
 * animation doesn't trail across the panel).
 *
 * Inside the modal we rebuild the HTML with allowZoom = true, set the
 * WebView's `setSupportZoom` prop, and let the user pinch + pan the SVG
 * up to 4× via Chromium's built-in zoom — no React-Native gesture
 * handler needed.
 */
export function MermaidModal({
  visible,
  onClose,
  source,
  palette,
  scheme,
}: Props) {
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const html = useMemo(
    () =>
      buildHtml({
        source,
        palette,
        scheme,
        profile: "screen",
        allowZoom: true,
      }),
    [source, palette, scheme],
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      transparent={false}
      statusBarTranslucent
    >
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <View
        style={[
          styles.root,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Diagram</Text>
          <Pressable
            onPress={onClose}
            style={styles.close}
            accessibilityLabel="Close diagram view"
          >
            <Text style={styles.closeGlyph}>✕</Text>
          </Pressable>
        </View>
        <WebView
          source={{ html, baseUrl: "https://cdn.jsdelivr.net/" }}
          originWhitelist={["*"]}
          style={styles.web}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          // The combination that turns on pinch-zoom in an Android WebView:
          // viewport meta declares maximum-scale=4, here we tell the host
          // WebView to actually honour zoom gestures from the user.
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          scalesPageToFit={false}
        />
      </View>
    </Modal>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: p.codeBg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
      backgroundColor: p.surface,
    },
    title: {
      color: p.textStrong,
      fontSize: 15,
      fontWeight: "600",
    },
    close: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    closeGlyph: {
      color: p.accent,
      fontSize: 20,
      lineHeight: 22,
    },
    web: {
      flex: 1,
      backgroundColor: p.codeBg,
    },
  });
}
