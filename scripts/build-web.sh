#!/usr/bin/env bash
# Production web build (Vite).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/web"
bun run build
echo "→ Build complete: $ROOT/web/dist"
