import { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import type { Palette } from "../lib/theme";
import { MermaidModal } from "./MermaidModal";

interface Props {
  /** Raw mermaid diagram source (no surrounding ```mermaid fences). */
  source: string;
  /** App theme — drives mermaid's colour palette. */
  scheme: "dark" | "light";
  /** Surface colour from the app palette so the SVG blends in. */
  palette: Palette;
}

export interface BuildHtmlOptions {
  source: string;
  palette: Palette;
  scheme: "dark" | "light";
  /**
   * When true the viewport meta + WebView setSupportZoom let the user
   * pinch-zoom the diagram (used by the fullscreen modal only).
   */
  allowZoom: boolean;
}

/**
 * Build the HTML page hosted inside the mermaid WebView. Shared by the
 * inline `<MermaidView>` and the fullscreen `<MermaidModal>` so the two
 * render paths can't drift.
 *
 * Why a WebView at all (not Expo's `'use dom'`): Metro's dev server hands
 * the DOM-component bundle back with Content-Type: application/json,
 * Chromium's strict MIME check refuses to execute it, the renderer
 * crashes before mermaid ever runs. Inline HTML side-steps Metro and
 * works identically in dev and production.
 */
export function buildHtml({
  source,
  palette,
  scheme,
  allowZoom,
}: BuildHtmlOptions): string {
  const cdn = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

  // Theme follows the app palette so dark mode gets the dark mermaid theme.
  const themeName = scheme === "dark" ? "dark" : "default";

  const viewportMeta = allowZoom
    ? `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4, user-scalable=yes" />`
    : `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />`;

  // HTML-escape the mermaid source. Mermaid syntax includes `<-->` and
  // `<-` arrows that the browser would otherwise parse as malformed tags.
  // Mermaid reads `textContent`, which decodes the entities back to chars.
  const safe = source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  ${viewportMeta}
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: ${palette.codeBg};
      color: ${palette.text};
      font-family: system-ui, -apple-system, sans-serif;
    }
    #wrap {
      padding: 12px;
      overflow-x: auto;
      overflow-y: hidden;
      box-sizing: border-box;
      -webkit-overflow-scrolling: touch;
    }
    #wrap svg { max-width: none !important; height: auto; }
    .err {
      color: ${scheme === "dark" ? "#f8b3b3" : "#b00020"};
      font-family: "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace;
      font-size: 12px;
      white-space: pre-wrap;
      padding: 12px;
    }
  </style>
</head>
<body>
  <div id="wrap"><div id="diagram" class="mermaid">${safe}</div></div>
  <script src="${cdn}"></script>
  <script>
    (function () {
      function reportHeight() {
        var svg = document.querySelector("#wrap svg");
        var pad = 24;
        var h;
        if (svg) {
          var rect = svg.getBoundingClientRect();
          h = Math.ceil(rect.height) + pad;
        } else {
          h = document.documentElement.scrollHeight;
        }
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: "height", value: h }));
        }
      }
      function showError(msg) {
        var w = document.getElementById("wrap");
        w.innerHTML = '<pre class="err">Mermaid render failed:\\n' + String(msg) + '</pre>';
        setTimeout(reportHeight, 50);
      }
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: ${JSON.stringify(themeName)},
          securityLevel: "loose",
          flowchart: { htmlLabels: true, useMaxWidth: false },
          sequence: { useMaxWidth: false }
        });
        var el = document.getElementById("diagram");
        var src = el.textContent;
        mermaid.render("m" + Math.random().toString(36).slice(2, 10), src)
          .then(function (out) {
            el.innerHTML = out.svg;
            setTimeout(reportHeight, 30);
            setTimeout(reportHeight, 200);
          })
          .catch(function (e) { showError(e && e.message || e); });
      } catch (e) {
        showError(e && e.message || e);
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Inline mermaid renderer. Renders at native size; tapping opens a
 * fullscreen modal with pinch-zoom + pan so wide flowcharts are readable.
 */
export default function MermaidView({ source, scheme, palette }: Props) {
  const html = useMemo(
    () => buildHtml({ source, palette, scheme, allowZoom: false }),
    [source, palette, scheme],
  );
  const [height, setHeight] = useState(360);
  const [modalOpen, setModalOpen] = useState(false);
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const body = (
    <View style={[styles.container, { height }]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://cdn.jsdelivr.net/" }}
        style={styles.web}
        scrollEnabled
        nestedScrollEnabled
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg?.type === "height" && typeof msg.value === "number") {
              const next = Math.min(2400, Math.max(120, Math.ceil(msg.value)));
              setHeight(next);
            }
          } catch {
            /* ignore */
          }
        }}
      />
    </View>
  );

  // Wrap in a Pressable that pops the fullscreen modal. The "↗" badge in
  // the top-right hints at the tap-to-zoom interaction.
  return (
    <>
      <Pressable onPress={() => setModalOpen(true)} style={styles.pressable}>
        {body}
        <View style={styles.zoomBadge} pointerEvents="none">
          <Text style={styles.zoomGlyph}>↗</Text>
        </View>
      </Pressable>
      <MermaidModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        source={source}
        palette={palette}
        scheme={scheme}
      />
    </>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    container: {
      backgroundColor: p.codeBg,
      width: "100%",
    },
    web: { flex: 1, backgroundColor: p.codeBg },
    pressable: { position: "relative" },
    zoomBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: p.surfacePressed,
      opacity: 0.85,
    },
    zoomGlyph: {
      color: p.textMuted,
      fontSize: 14,
      lineHeight: 14,
    },
  });
}
