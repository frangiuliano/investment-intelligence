#!/usr/bin/env bash
# Verify package-lock.json installs cleanly on Linux (same as GitHub Actions).
# macOS `npm ci` can succeed while Linux CI fails on optional native deps
# (e.g. missing @emnapi/*). Always run this before pushing lockfile changes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "verify:lockfile: Docker not found; falling back to local npm ci in a temp dir."
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  cp package.json package-lock.json "$TMP/"
  (cd "$TMP" && npm ci --ignore-scripts)
  echo "verify:lockfile: OK (local)"
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp package.json package-lock.json "$TMP/"

docker run --rm \
  -v "$TMP:/app" \
  -w /app \
  node:22-bookworm-slim \
  npm ci --ignore-scripts

echo "verify:lockfile: OK (linux/node:22)"
