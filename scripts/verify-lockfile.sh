#!/usr/bin/env bash
# Verify every package-lock.json installs cleanly on Linux (same as GitHub
# Actions). macOS `npm ci` can succeed while Linux CI fails on optional native
# deps (e.g. missing @emnapi/*). Always run this before pushing lockfile
# changes. Covers the root Nest project and the web/ dashboard.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Directories (relative to ROOT) that ship their own package-lock.json.
PROJECT_DIRS=("." "web")

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

verify_dir() {
  local project_dir="$1"
  local abs_dir="$ROOT/$project_dir"

  if [ ! -f "$abs_dir/package-lock.json" ]; then
    echo "verify:lockfile: ERROR — $project_dir/package-lock.json is missing." >&2
    echo "Every directory in PROJECT_DIRS must ship a committed lockfile; CI runs npm ci there." >&2
    return 1
  fi

  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  cp "$abs_dir/package.json" "$abs_dir/package-lock.json" "$tmp/"

  docker run --rm \
    -v "$tmp:/app" \
    -w /app \
    node:22-bookworm-slim \
    npm ci --ignore-scripts

  echo "verify:lockfile: OK ($project_dir, linux/node:22)"
}

for project_dir in "${PROJECT_DIRS[@]}"; do
  verify_dir "$project_dir"
done

echo "verify:lockfile: all lockfiles OK (linux/node:22)"
