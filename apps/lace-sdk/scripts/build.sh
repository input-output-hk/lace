#!/usr/bin/env bash
# Builds the SDK's channels (ADR 66) with their checks. With SDK_CHANNEL set,
# only that channel is built, into dist/, as a publish needs. Otherwise both
# are: canary into dist-canary/, for in-repo consumers of canary features, then
# stable into dist/. Each build writes dist/ while its checks run, because the
# checks install the package from it.
set -euo pipefail
cd "$(dirname "$0")/.."

build() {
  export SDK_CHANNEL="$1"
  node test/check-doc-comments.mjs
  npx tsdown
  (
    trap 'rm -rf dist/.dts-work tsconfig.dts-gen.generated.json' EXIT
    entries=$(node --input-type=module -e "
      import { channelEntryNames } from './scripts/entries.mjs';
      console.log(channelEntryNames(process.env.SDK_CHANNEL).join(' '));
    ")
    for entry in $entries; do
      # Global augmentations from another entry must not enter its declarations.
      find dist/.dts-work -mindepth 1 -maxdepth 1 ! -name bundled-contracts.json -exec rm -rf {} +
      ENTRY="$entry" node scripts/dts-gen-config.mjs
      # The workspace's TypeScript, whatever tsc PATH holds: run directly,
      # outside Nx and npm, PATH has no node_modules/.bin, and a runner's
      # global tsc can be another major.
      npx tsc -p tsconfig.dts-gen.generated.json
      npx rollup -c rollup.dts.config.mjs --environment "ENTRY:$entry"
    done
  )
  node test/check-declaration-dependencies.mjs
  node test/check-bundled-licences.mjs
  node test/check-export-surface.mjs
  node test/check-cardano-bundle.mjs
  node test/check-node-load.mjs
  node test/check-cardano-identity.mjs
  node test/check-consumer-types.mjs
}

if [[ -n "${SDK_CHANNEL:-}" ]]; then
  build "$SDK_CHANNEL"
  exit 0
fi

build canary
rm -rf dist-canary
mv dist dist-canary
build stable
