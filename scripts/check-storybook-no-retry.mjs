#!/usr/bin/env node
// False-green guard for the mobile storybook runner.
//
// A Jest retry re-runs the test body, which re-emits `setCurrentStory` for the SAME
// storyId. Storybook's `renderSelection` short-circuits on an unchanged selection and
// emits STORY_UNCHANGED instead of re-rendering, and @storybook/test-runner's
// `storyUnchanged` listener resolves that as a PASS — without the play function ever
// running. So a single retry turns every deterministic failure into a green, which is
// exactly how the suite once reported 11/11 while hiding real defects
// (docs/troubleshooting-flaky-storybook-tests.md).
//
// `setupFilesAfterEnv` in the runner's jest config is where that retry was registered,
// so this checks the config itself and every repo-owned file it wires in — the text of
// those files only, not what they import, so a `retryTimes` moved into an imported
// helper still passes. Retries registered elsewhere (a global setup, a story file) are
// out of scope too: this guards the shape the regression actually had.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CONFIG_REL_PATH = 'apps/lace-mobile-storybook/test-runner-jest.config.js';
const SETUP_KEY = 'setupFilesAfterEnv';
const RETRY_CALL = /\bretryTimes\s*\(/;

// The key's own comment names `jest.retryTimes`, and the next one might spell it with
// parentheses — match code, not prose. `[^:]` keeps `https://` out of the line-comment rule.
const stripComments = source =>
  source
    .replaceAll(/\/\*[\S\s]*?\*\//g, '')
    .replaceAll(/(^|[^:])\/\/.*$/gm, '$1');

const fail = problems => {
  console.error(
    `\n❌ storybook no-retry check FAILED — a Jest retry scores a deterministic failure as a pass\n`,
  );
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    `\n  Fix the race the story actually loses instead; see ` +
      `docs/troubleshooting-flaky-storybook-tests.md.\n`,
  );
  process.exit(1);
};

const configText = readFileSync(resolve(repoRoot, CONFIG_REL_PATH), 'utf8');
const configCode = stripComments(configText);

// Bracket depth, not a regex: the array holds a conditional spread whose nested
// `[`/`]` a non-greedy match would stop at.
const keyMatch = configCode.match(
  new RegExp(String.raw`${SETUP_KEY}\s*:\s*\[`),
);
if (!keyMatch) {
  fail([
    `${CONFIG_REL_PATH}: no \`${SETUP_KEY}\` array found. The config was restructured, ` +
      `so this check no longer proves anything — update it to match.`,
  ]);
}

const arrayStart = keyMatch.index + keyMatch[0].length - 1;
let depth = 0;
let arrayEnd = -1;
for (let i = arrayStart; i < configCode.length; i++) {
  if (configCode[i] === '[') depth++;
  else if (configCode[i] === ']' && --depth === 0) {
    arrayEnd = i;
    break;
  }
}
if (arrayEnd === -1) {
  fail([
    `${CONFIG_REL_PATH}: \`${SETUP_KEY}\` array is unterminated — cannot check it.`,
  ]);
}

const setupFiles = [
  ...configCode
    .slice(arrayStart, arrayEnd + 1)
    .matchAll(/<rootDir>\/([^'"`]+)/g),
].map(([, relPath]) => relPath);

// Scanning nothing is the false green this whole check exists to prevent: rewrite the
// entries as `require.resolve(…)` or build the array from a helper and the `<rootDir>`
// match finds none, leaving a green that proves nothing.
if (setupFiles.length === 0) {
  fail([
    `${CONFIG_REL_PATH}: \`${SETUP_KEY}\` lists no '<rootDir>/…' file, so there is ` +
      `nothing left to check. Teach this check the new shape rather than deleting it.`,
  ]);
}

const problems = [];

if (RETRY_CALL.test(configCode)) {
  problems.push(`${CONFIG_REL_PATH}: calls retryTimes(...)`);
}

for (const relPath of setupFiles) {
  let text;
  try {
    text = readFileSync(resolve(repoRoot, relPath), 'utf8');
  } catch {
    problems.push(
      `${relPath}: wired into \`${SETUP_KEY}\` but not readable — cannot check it for retryTimes(...)`,
    );
    continue;
  }
  if (RETRY_CALL.test(stripComments(text))) {
    problems.push(
      `${relPath}: calls retryTimes(...), and is wired into \`${SETUP_KEY}\``,
    );
  }
}

if (problems.length > 0) fail(problems);

console.log(
  `[check-storybook-no-retry] ${SETUP_KEY} registers no retry (${setupFiles.length} repo-owned setup file(s) checked) ✓`,
);
