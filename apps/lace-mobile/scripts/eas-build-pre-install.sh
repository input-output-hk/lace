#!/bin/bash
# This script runs before npm install during EAS builds.
# - Local builds: token not provided, uses existing ~/.npmrc
# - Cloud builds: token from EAS secrets, appends to .npmrc

set -e

# --- Validate Node version sync ---
# EAS Cloud doesn't read .nvmrc, so we specify node version in eas.json.
# This ensures eas.json stays in sync with root .nvmrc (source of truth).

NVMRC_VERSION=$(cat "$EAS_BUILD_WORKINGDIR/.nvmrc" | tr -d '[:space:]')
EAS_VERSION=$(jq -r '.build.base.node' "$EAS_BUILD_WORKINGDIR/apps/lace-mobile/eas.json")

if [ "$NVMRC_VERSION" != "$EAS_VERSION" ]; then
  echo "❌ Node version mismatch: .nvmrc=$NVMRC_VERSION, eas.json=$EAS_VERSION"
  exit 1
fi
echo "✅ Node versions in sync: $NVMRC_VERSION"

# --- Configure npm authentication ---
# If the token is provided (cloud build), append to .npmrc
# If not provided (local build), assume ~/.npmrc is already configured

if [ -z "${NPM_TOKEN:-}" ]; then
  echo "ℹ️  Auth token not provided - using existing npm config"
  exit 0
fi

echo "✅ Auth token provided - configuring .npmrc"

ROOT_NPMRC="$EAS_BUILD_WORKINGDIR/.npmrc"

cat >> "$ROOT_NPMRC" << EOF
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
EOF

echo "✅ Auth token appended to .npmrc"

