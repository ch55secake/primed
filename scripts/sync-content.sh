#!/usr/bin/env bash
# Re-sync content files from the Obsidian vault into public/.
# Run after editing the canonical notes in Obsidian. The committed
# copies in public/ are what Vercel reads at build time.
set -euo pipefail

VAULT="$HOME/Documents/private-vault/Notes"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cp "$VAULT/System-Design-Patterns.md"               "$ROOT/public/patterns.md"
cp "$VAULT/Neet-150-Pattens.md"                     "$ROOT/public/neetcode-150.md"
cp "$VAULT/Java Interview Primer - 100 Questions.md" "$ROOT/public/java-interview-primer.md"

echo "Synced 3 files from $VAULT into $ROOT/public/"
