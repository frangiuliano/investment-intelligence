#!/usr/bin/env bash
# Verify package-lock.json installs cleanly on Linux (same as GitHub Actions).
# macOS `npm ci` can succeed while Linux CI fails on optional native deps
# (e.g. missing @emnapi/*). Always run this before pushing lockfile changes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "verify:lockfile: ERROR — Docker is required." >&2
  echo "Local macOS npm ci can pass while GitHub Actions (Linux) fails on optional deps." >&2
  echo "Install Docker Desktop, then re-run: npm run verify:lockfile" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "verify:lockfile: ERROR — Docker is installed but the daemon is not running." >&2
  echo "Start Docker Desktop, then re-run: npm run verify:lockfile" >&2
  exit 1
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
