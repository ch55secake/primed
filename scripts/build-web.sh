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
for f in manifest.json patterns.md neetcode-150.md java-interview-primer.md kotlin-interview-primer.md; do
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

echo "→ Build complete: $OUT"
