/* eslint-disable no-console */

/*
Gate for the Reassure two-pass CI job (docs/plans/reassure-ci-two-pass.md).

Reads <package-dir>/.reassure/output.json (written by `reassure` when a
baseline exists) and fails on render/function COUNT regressions and on suites
that vanished from the comparison — both deterministic and machine-independent.
Duration changes and render issues are surfaced as warnings but never block
(hosted-runner noise).

A removed suite is a gate failure because a rename lands as removed+added,
which would let a regression ride in unmeasured. Set REASSURE_ALLOW_REMOVED=1
on an intentional deletion or rename.

Usage: node scripts/reassure-check.js <package-dir>
Env:   REASSURE_GATE — 'fail' enforces the gate; anything else (or unset)
       reports problems without failing (rollout stage 1).
       REASSURE_ALLOW_REMOVED — '1' downgrades removed suites to a warning.
*/

const fs = require('fs');
const path = require('path');

/**
 * Pure decision function over reassure-compare's output.json.
 * Returns { failed, messages } so it can be unit-tested without a filesystem.
 * Each message is { level: 'error' | 'notice' | 'warning', text }.
 */
const evaluateComparison = (output, { allowRemoved = false } = {}) => {
  const messages = [];
  const errors = output.errors ?? [];
  const countChanged = output.countChanged ?? [];
  const regressions = countChanged.filter(entry => entry.countDiff > 0);
  const improvements = countChanged.filter(entry => entry.countDiff < 0);
  const removed = output.removed ?? [];

  for (const error of errors) {
    messages.push({
      level: 'error',
      text: `Reassure comparison error: ${error}`,
    });
  }
  for (const entry of regressions) {
    messages.push({
      level: 'error',
      text:
        `render count regression: "${entry.name}" ` +
        `${entry.baseline.meanCount} → ${entry.current.meanCount}`,
    });
  }
  for (const entry of removed) {
    messages.push({
      level: allowRemoved ? 'warning' : 'error',
      text:
        `suite no longer measured: "${entry.name}" — a rename lands as ` +
        'removed+added and escapes comparison (set REASSURE_ALLOW_REMOVED=1 if intentional)',
    });
  }
  for (const entry of improvements) {
    messages.push({
      level: 'notice',
      text:
        `render count improved: "${entry.name}" ` +
        `${entry.baseline.meanCount} → ${entry.current.meanCount}`,
    });
  }
  for (const entry of output.added ?? []) {
    messages.push({
      level: 'warning',
      text: `new suite, no baseline to compare: "${entry.name}"`,
    });
  }
  for (const warning of output.warnings ?? []) {
    messages.push({
      level: 'warning',
      text: `Reassure comparison: ${warning}`,
    });
  }
  for (const entry of output.significant ?? []) {
    messages.push({
      level: 'warning',
      text:
        `duration change (warn-only): "${entry.name}" ` +
        `${entry.baseline.meanDuration.toFixed(1)}ms → ` +
        `${entry.current.meanDuration.toFixed(1)}ms`,
    });
  }
  // Aggregated: nearly every suite carries a permanent "initial updates: 1",
  // and GitHub's checks UI shows ~10 annotations per step — per-suite
  // warnings would bury a real one under known noise.
  const renderIssues = output.renderIssues ?? [];
  if (renderIssues.length > 0) {
    messages.push({
      level: 'warning',
      text:
        `render issues (warn-only) in ${renderIssues.length} ` +
        `suite${renderIssues.length === 1 ? '' : 's'} — ` +
        'see the "Render Issues" table in the PR comment',
    });
  }

  return {
    failed: messages.some(message => message.level === 'error'),
    messages,
  };
};

const main = () => {
  const packageDirectory = process.argv[2];
  if (!packageDirectory) {
    console.error('Usage: node scripts/reassure-check.js <package-dir>');
    process.exit(1);
  }

  const outputPath = path.join(packageDirectory, '.reassure', 'output.json');
  if (!fs.existsSync(outputPath)) {
    console.log(
      'No comparison output (no baseline at merge-base) — report-only run.',
    );
    return;
  }

  const gate = process.env.REASSURE_GATE === 'fail';

  // A corrupt output.json must not fail a report-only run: the rollout's
  // stage 1 promises the job never blocks.
  const output = (() => {
    try {
      return JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    } catch (error) {
      console.log(`::warning::unreadable ${outputPath}: ${error.message}`);
      return undefined;
    }
  })();
  if (!output) {
    if (gate) process.exit(1);
    return;
  }

  const { failed, messages } = evaluateComparison(output, {
    allowRemoved: process.env.REASSURE_ALLOW_REMOVED === '1',
  });

  for (const { level, text } of messages) {
    const line = `::${level}::${text}`;
    if (level === 'error') console.error(line);
    else console.log(line);
  }

  if (failed && gate) process.exit(1);
  if (failed) {
    console.log(
      'REASSURE_GATE is not "fail" — problems reported but not blocking (rollout stage 1).',
    );
  } else {
    console.log('No render count regressions.');
  }
};

if (require.main === module) main();

module.exports = { evaluateComparison };
