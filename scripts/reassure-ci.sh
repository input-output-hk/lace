#!/usr/bin/env bash

# Two-pass Reassure measurement for pull requests (docs/plans/reassure-ci-two-pass.md).
#
# Measures the perf island twice on the SAME runner — once at the merge-base
# (baseline) and once at the PR head (current) — so the only variable between
# the two measurements is the PR's diff. Comparison output lands in
# <package-dir>/.reassure/output.{md,json}; scripts/reassure-check.js gates on it.
#
# Usage: reassure-ci.sh <package-dir>   e.g. reassure-ci.sh packages/lib/ui-toolkit
# Env:   GITHUB_BASE_REF — PR base branch (defaults to main)

set -euo pipefail

PKG_DIR="$1"
BASE_REF="${GITHUB_BASE_REF:-main}"

HEAD_SHA=$(git rev-parse HEAD)
BASELINE_SHA=$(git merge-base "origin/$BASE_REF" HEAD)

echo "baseline: $BASELINE_SHA (merge-base with origin/$BASE_REF)"
echo "current:  $HEAD_SHA"

# Reassure is invoked directly (not via `npx nx run <project>:test-perf`): the
# nx layer adds nothing here and a measurement task must never be cacheable
# (test-perf is not in nx.json cacheableOperations — keep that invariant).
#
# --testTimeout: hosted 2-core runners are >10x slower than dev machines and
# the heavy update-scenario measurements exceed Jest's 5s default. Passed as a
# CLI flag (not only in jest.perf.config.js) because the BASELINE pass runs
# the merge-base's config, which may predate the setting.
run_reassure() {
  (
    cd "$PKG_DIR"
    TEST_RUNNER_PATH=../../../node_modules/.bin/jest \
      TEST_RUNNER_ARGS='--config jest.perf.config.js --runInBand --forceExit --testTimeout=300000' \
      ../../../node_modules/.bin/reassure "$@"
  )
}

lockfile_at() { git rev-parse "$1:package-lock.json"; }

# The island may not exist at the merge-base (PRs based before it landed).
# Without a baseline the run is report-only: measure head, no comparison —
# reassure-check.js treats the missing output.json as a pass.
if ! git cat-file -e "$BASELINE_SHA:$PKG_DIR/jest.perf.config.js" 2>/dev/null; then
  echo "::notice::perf island missing at merge-base — measuring head only (report-only)"
  run_reassure
  exit 0
fi

LOCKFILES_DIFFER=false
if [ "$(lockfile_at "$BASELINE_SHA")" != "$(lockfile_at "$HEAD_SHA")" ]; then
  LOCKFILES_DIFFER=true
fi

git checkout --quiet "$BASELINE_SHA"
if [ "$LOCKFILES_DIFFER" = true ]; then
  echo "package-lock.json differs at merge-base — installing baseline dependencies"
  npm ci
fi
run_reassure --baseline

git checkout --quiet "$HEAD_SHA"
if [ "$LOCKFILES_DIFFER" = true ]; then
  echo "restoring head dependencies"
  npm ci
fi
run_reassure
