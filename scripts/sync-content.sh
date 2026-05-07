#!/usr/bin/env bash
# Re-sync content files from the Obsidian vault into web/public/.
# Run after editing the canonical notes in Obsidian. The committed
# copies in web/public/ are what Vercel reads at build time.
# Also bundles into mobile/assets/content/ for the Android app's
# offline fallback.
set -euo pipefail

VAULT="$HOME/Documents/private-vault/Notes"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/web/public"
MOBILE="$ROOT/mobile/assets/content"

cp "$VAULT/System-Design-Patterns.md"               "$WEB/patterns.md"
cp "$VAULT/Neet-150-Pattens.md"                     "$WEB/neetcode-150.md"
cp "$VAULT/Java Interview Primer - 100 Questions.md" "$WEB/java-interview-primer.md"
echo "Synced 3 files from $VAULT into $WEB/"

# Mirror to mobile/assets/content/ if mobile exists
if [ -d "$ROOT/mobile" ]; then
  mkdir -p "$MOBILE"
  cp "$WEB/patterns.md"               "$MOBILE/patterns.md"
  cp "$WEB/neetcode-150.md"           "$MOBILE/neetcode-150.md"
  cp "$WEB/java-interview-primer.md"  "$MOBILE/java-interview-primer.md"
  echo "Mirrored to $MOBILE/"
fi
