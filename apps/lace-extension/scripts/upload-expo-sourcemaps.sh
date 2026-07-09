#!/bin/bash
set -euo pipefail

# Upload extension tab Expo/Metro source maps to Sentry.
# Run AFTER build completes (expo export must include --dump-sourcemap).
#
# Required environment variables:
#   SENTRY_AUTH_TOKEN  — Sentry API auth token
#   SENTRY_ORG         — Sentry organization slug (e.g. "iohk-j4")
#   SENTRY_PROJECT_ID  — Sentry project slug or numeric ID

JS_DIR="dist/expo/_expo/static/js/web"

# Validate required env vars
if [ -z "${SENTRY_AUTH_TOKEN:-}" ]; then
  echo "SENTRY_AUTH_TOKEN not set. Skipping source map upload."
  exit 0
fi

if [ -z "${SENTRY_ORG:-}" ]; then
  echo "SENTRY_ORG not set"
  exit 1
fi

if [ -z "${SENTRY_PROJECT_ID:-}" ]; then
  echo "SENTRY_PROJECT_ID not set"
  exit 1
fi

# Verify source maps exist
MAP_FILES=("$JS_DIR"/*.map)
if [ ! -f "${MAP_FILES[0]}" ]; then
  echo "❌ No .map files found in $JS_DIR"
  echo "Did you run expo export with --dump-sourcemap?"
  exit 1
fi

echo "Uploading extension tab source maps to Sentry..."
echo "  Source directory: $JS_DIR"
echo "  Map file count: ${#MAP_FILES[@]}"

# Read version from manifest.json
VERSION=$(jq -r '.version' "assets/manifest.json")

# Upload source maps using debug IDs (injected by getSentryExpoConfig).
# Debug IDs match maps to bundles; --release associates with a Sentry release
# so they appear in the Releases page alongside the SW source maps.
npx sentry-cli sourcemaps upload \
  --org "$SENTRY_ORG" \
  --project "$SENTRY_PROJECT_ID" \
  --release "$VERSION" \
  "$JS_DIR"

echo "Removing source maps from dist (should not ship in extension zip)..."
rm -f "$JS_DIR"/*.map

echo "✅ Extension tab source maps uploaded and cleaned up"
