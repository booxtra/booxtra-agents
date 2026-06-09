#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== 1/5  Validating ==="
node "$ROOT/scripts/validate.mjs"

echo "=== 2/5  Building @booxtra/knowledge ==="
node "$ROOT/scripts/lib/build-knowledge-package.mjs"

echo "=== 3/5  Building Claude plugin ==="
node "$ROOT/scripts/lib/build-claude.mjs"

echo "=== 4/5  Building Hermes plugin ==="
node "$ROOT/scripts/lib/build-hermes.mjs"

echo "=== 5/5  Building Gemini extension ==="
node "$ROOT/scripts/lib/build-gemini.mjs"

echo "=== Build complete ==="
