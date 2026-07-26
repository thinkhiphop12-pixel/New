#!/usr/bin/env bash
# Build the game as a static export for the ballknw.com /gaffa path.
#
# The live site (vercel.json: framework null, outputDirectory ".") serves the
# repo as static files, so the playable game is the committed export at
# <repo root>/gaffa. Run this after changing the game, then commit
# the regenerated folder:
#
#   npm -w src/games/football-manager run export:static
#
# API routes (email capture / event tracking) cannot exist in a static export,
# so they are set aside for the duration of the build; the client code already
# degrades gracefully when those endpoints 404.
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(cd ../../.. && pwd)"
API_DIR="app/api"
API_STASH=".api-stash"

restore() { [ -d "$API_STASH" ] && rm -rf "$API_DIR" && mv "$API_STASH" "$API_DIR" || true; }
trap restore EXIT

rm -rf out .next
mv "$API_DIR" "$API_STASH"

STATIC_EXPORT=1 NEXT_PUBLIC_BASE_PATH=/gaffa npx next build

rm -rf "$REPO_ROOT/gaffa"
cp -r out "$REPO_ROOT/gaffa"
echo "Static export written to $REPO_ROOT/gaffa"
