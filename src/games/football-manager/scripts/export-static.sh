#!/usr/bin/env bash
# Build the game as a static export for the ballknw.com /gaffa path.
#
# Vercel runs this script itself on every deploy: vercel.json sets
# buildCommand to null, which means *unset* (not "skip the build"), so Vercel
# auto-detects and runs the root `build` script -- which is this export. The
# /gaffa/ that production serves is therefore generated at deploy time, NOT the
# copy committed here.
#
# The committed <repo root>/gaffa still matters for local preview (`npm run dev`
# serves it straight off disk), so regenerate and commit it after changing the
# game to keep the two in step:
#
#   npm -w src/games/football-manager run export:static
#
# What this means in practice: a stale committed /gaffa/ makes local preview lie,
# but cannot break production. Never hand-edit build hashes in /gaffa/ to chase a
# production problem -- rebuild from source.
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
