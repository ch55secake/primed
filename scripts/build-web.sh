#!/usr/bin/env bash
# Production web build for Vercel.
#
# Replaces the old Vite-based `web/` SPA with the Expo Web export of the
# mobile/ codebase so both surfaces share one set of components, theme,
# manifest, reader, settings, and content pipeline.
#
# Output layout (after this script runs, ready for Vercel to serve):
#   mobile/dist/index.html              ← Expo Web SPA shell
#   mobile/dist/_expo/static/js/…       ← bundled JS + assets
#   mobile/dist/favicon.ico
#   mobile/dist/manifest.json           ← runtime manifest (mirrored from web/public)
#   mobile/dist/patterns.md             ← source content (mirrored from web/public)
#   mobile/dist/neetcode-150.md
#   mobile/dist/java-interview-primer.md
#   mobile/dist/kotlin-interview-primer.md
#   mobile/dist/postgres-interview-primer.md
#   mobile/dist/sql-practice.md
#   mobile/dist/csharp-interview-primer.md
#   mobile/dist/system-design-patterns-primer.md
#   mobile/dist/dsa-patterns-primer.md
#
# The mobile app fetches the markdown + manifest from the same Vercel
# URL via mobile/lib/content.ts:REMOTE_BASE, so keeping `manifest.json`
# and `*.md` at the deploy root is non-negotiable.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"
WEB_PUBLIC="$ROOT/web/public"
OUT="$MOBILE/dist"

echo "→ Exporting Expo Web SPA"
cd "$MOBILE"
bunx expo export --platform web --clear

echo "→ Mirroring web/public/* (manifest + markdown) into $OUT"
for f in service-worker.js manifest.json patterns.md neetcode-150.md java-interview-primer.md kotlin-interview-primer.md postgres-interview-primer.md sql-practice.md csharp-interview-primer.md system-design-patterns-primer.md dsa-patterns-primer.md; do
  if [ -f "$WEB_PUBLIC/$f" ]; then
    cp "$WEB_PUBLIC/$f" "$OUT/$f"
    echo "   ✓ $f"
  fi
done

# favicon.svg / icons.svg too, so the web app keeps its existing branding
for f in favicon.svg icons.svg; do
  if [ -f "$WEB_PUBLIC/$f" ]; then
    cp "$WEB_PUBLIC/$f" "$OUT/$f"
  fi
done

# Self-hosted JetBrains Mono (code font), served at /fonts/ and precached
# by the service worker so code blocks render correctly offline.
if [ -d "$WEB_PUBLIC/fonts" ]; then
  mkdir -p "$OUT/fonts"
  cp "$WEB_PUBLIC/fonts/"*.woff2 "$OUT/fonts/" 2>/dev/null || true
  echo "   ✓ fonts/ ($(ls "$WEB_PUBLIC/fonts" | wc -l | tr -d ' ') files)"
fi

# Inject the @font-face declarations + preloads into <head>. Expo's
# +html.tsx strips custom <style>/<link> on export, so we do it here as a
# deterministic post-step. Without this the MONO_FONT family has nothing
# to resolve to and code falls back to the platform monospace.
echo "→ Injecting JetBrains Mono @font-face into index.html"
FONT_HEAD=$(cat <<'HTML'
<link rel="preload" as="font" type="font/woff2" crossorigin="anonymous" href="/fonts/jetbrains-mono-400-normal.woff2" />
<link rel="preload" as="font" type="font/woff2" crossorigin="anonymous" href="/fonts/jetbrains-mono-700-normal.woff2" />
<style id="drilly-fonts">
@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:400;font-display:swap;src:url('/fonts/jetbrains-mono-400-normal.woff2') format('woff2');}
@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:700;font-display:swap;src:url('/fonts/jetbrains-mono-700-normal.woff2') format('woff2');}
@font-face{font-family:'JetBrains Mono';font-style:italic;font-weight:400;font-display:swap;src:url('/fonts/jetbrains-mono-400-italic.woff2') format('woff2');}
</style>
HTML
)
# Insert before </head>. Use a python one-liner for a safe literal replace
# (sed chokes on the multiline payload + slashes in the CSS).
OUT="$OUT" FONT_HEAD="$FONT_HEAD" python3 - <<'PY'
import os
path = os.path.join(os.environ["OUT"], "index.html")
html = open(path, encoding="utf-8").read()
if "drilly-fonts" not in html:
    html = html.replace("</head>", os.environ["FONT_HEAD"] + "\n</head>", 1)
    open(path, "w", encoding="utf-8").write(html)
    print("   ✓ @font-face injected")
else:
    print("   • already present, skipped")
PY

echo "→ Build complete: $OUT"
