import { useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import type { Palette } from "../lib/theme";

interface Props {
  /** Raw mermaid diagram source (no surrounding ```mermaid fences). */
  source: string;
  /** App theme — drives mermaid's colour palette. */
  scheme: "dark" | "light";
  /** Surface colour from the app palette so the SVG blends in. */
  palette: Palette;
}

/**
 * Mermaid renderer. Drops the diagram source into a self-contained
 * WebView HTML page that loads `mermaid` from a CDN, renders, and posts
 * its rendered SVG height back so we can size the WebView to fit.
 *
 * Why not the Expo `'use dom'` directive: in dev mode Metro serves the
 * DOM-component bundle with `Content-Type: application/json`, which
 * Chromium's strict MIME check rejects — the WebView renderer crashes
 * before mermaid ever runs. A direct WebView with inline HTML side-
 * steps the dev-server entirely and works the same way in production.
 */
function buildHtml(source: string, palette: Palette, scheme: "dark" | "light"): string {
  // Mermaid CDN — pinned major to avoid surprise upgrades.
  const cdn = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
  const theme = scheme === "dark" ? "dark" : "default";
  // HTML-escape the source. Mermaid syntax includes `<-->` and `<-` arrows
  // that the browser would otherwise parse as malformed HTML tags. Mermaid
  // reads `textContent`, which decodes the entities back to real chars.
  const safe = source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4, user-scalable=yes" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: ${palette.codeBg};
      color: ${palette.text};
      font-family: system-ui, -apple-system, sans-serif;
    }
    /* The wrapper is horizontally scrollable when the diagram is wider
       than the viewport. Vertical scroll is owned by the surrounding
       Reader page so the WebView itself reports its full natural height. */
    #wrap {
      padding: 12px;
      overflow-x: auto;
      overflow-y: hidden;
      box-sizing: border-box;
      -webkit-overflow-scrolling: touch;
    }
    /* Render the SVG at its native intrinsic size — no horizontal scaling.
       Mermaid emits width/height in pixels via its <svg> attributes;
       we strip max-width so wide diagrams scroll instead of squashing. */
    #wrap svg { max-width: none !important; height: auto; }
    .err {
      color: ${scheme === "dark" ? "#f8b3b3" : "#b00020"};
      font-family: Courier, monospace;
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
        // Use the rendered SVG's bounding box rather than documentElement
        // .scrollHeight, which over-reports because of the wrap padding
        // and intrinsic body height.
        var svg = document.querySelector("#wrap svg");
        var pad = 24; // 12px top + 12px bottom in #wrap
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
          theme: ${JSON.stringify(theme)},
          securityLevel: "loose",
          flowchart: { htmlLabels: true, useMaxWidth: false },
          sequence: { useMaxWidth: false },
        });
        var el = document.getElementById("diagram");
        var src = el.textContent;
        mermaid.render("m" + Math.random().toString(36).slice(2, 10), src)
          .then(function (out) {
            el.innerHTML = out.svg;
            // Two delayed reports: one quick (immediate after layout) and
            // one a beat later to catch the final SVG bbox once mermaid's
            // font measurement settles.
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

export default function MermaidView({ source, scheme, palette }: Props) {
  const html = useMemo(() => buildHtml(source, palette, scheme), [source, palette, scheme]);
  const [height, setHeight] = useState(360);
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://cdn.jsdelivr.net/" }}
        style={styles.web}
        // Horizontal-scroll is owned by the WebView so wide flowcharts
        // stay readable instead of being squashed to fit. Vertical scroll
        // is owned by the surrounding Reader page so this WebView reports
        // its full natural height back via postMessage.
        scrollEnabled
        nestedScrollEnabled
        javaScriptEnabled
        domStorageEnabled
        // Some hosts return strict MIME types on the CDN — accept all.
        setSupportMultipleWindows={false}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg?.type === "height" && typeof msg.value === "number") {
              // Clamp to a reasonable range; tiny SVGs shouldn't collapse
              // the frame and giant ones don't get cut off.
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
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    container: {
      backgroundColor: p.codeBg,
      width: "100%",
    },
    web: { flex: 1, backgroundColor: p.codeBg },
  });
}
