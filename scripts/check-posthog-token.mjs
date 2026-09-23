#!/usr/bin/env node
// Release tripwire: the PostHog project token baked into a build artifact must be
// the production one.
//
// The token is inlined as a literal at build time (POSTHOG_API_TOKEN -> the
// EXPO_PUBLIC_ copy written by prepare-expo-env.ts -> Expo/webpack substitution),
// so nothing downstream re-checks it and a wrong value is invisible until events
// land in the wrong project — after the artifact has shipped. Worse, the build
// cannot fail on its own: webpack/.env.defaults carries
// `POSTHOG_API_TOKEN=placeholder`, so an unset or misnamed secret produces a
// clean, completely untelemetered build.
//
// The expected prefix is pinned HERE, in version control, rather than read from a
// repo variable: the whole value of this check is that changing what counts as
// "production" takes a reviewed commit. A variable could be edited to match a bad
// build, which is the failure this exists to catch.
//
// Usage: node scripts/check-posthog-token.mjs <dist-dir>
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Leading segment of the production project token. A prefix rather than the whole
// token, so a rotation within the same project does not red the release lane.
const EXPECTED_PREFIX = 'phc_ywxXfA5sEe5NJEi';

// PostHog project tokens: `phc_` + base62. The {20,} floor keeps the match off
// prose and short identifiers that merely start with the same four characters.
const TOKEN_PATTERN = /phc_[A-Za-z0-9]{20,}/g;

// Only files that can carry an inlined string literal. Reading the rest (fonts,
// images, wasm) would cost minutes on a release-sized dist for no signal.
const SCANNED_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.map',
  '.mjs',
  '.txt',
]);

const distributionDirectory = resolve(process.argv[2] ?? '');

if (!process.argv[2]) {
  console.error('::error::usage: check-posthog-token.mjs <dist-dir>');
  process.exit(1);
}

const walk = directory =>
  readdirSync(directory).flatMap(entry => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

let files;
try {
  files = walk(distributionDirectory);
} catch (error) {
  console.error(
    `::error::cannot read build output at ${distributionDirectory}: ${error.message}`,
  );
  process.exit(1);
}

// latin1 maps bytes 1:1 and never throws, so a stray binary among the scanned
// extensions degrades to a non-match instead of killing the run.
const findings = new Map();
for (const file of files) {
  const extension = file.slice(file.lastIndexOf('.'));
  if (!SCANNED_EXTENSIONS.has(extension)) continue;

  for (const [token] of readFileSync(file, 'latin1').matchAll(TOKEN_PATTERN)) {
    const seenIn = findings.get(token) ?? new Set();
    seenIn.add(relative(distributionDirectory, file));
    findings.set(token, seenIn);
  }
}

const expected = [...findings.keys()].filter(token =>
  token.startsWith(EXPECTED_PREFIX),
);
const foreign = [...findings.keys()].filter(
  token => !token.startsWith(EXPECTED_PREFIX),
);

// Identify a wrong project without reprinting a whole credential into CI logs.
const describe = token =>
  `${token.slice(0, EXPECTED_PREFIX.length)}… (in ${[...findings.get(token)]
    .slice(0, 3)
    .join(', ')})`;

console.log(
  `Scanned ${files.length} file(s) under ${distributionDirectory}; ` +
    `found ${findings.size} distinct PostHog token(s).`,
);

if (expected.length === 0) {
  console.error(
    `::error::no PostHog token starting with ${EXPECTED_PREFIX} in the build output. ` +
      (foreign.length > 0
        ? `Found instead: ${foreign
            .map(describe)
            .join('; ')}. The build used the wrong POSTHOG_API_TOKEN.`
        : 'No PostHog token at all — POSTHOG_API_TOKEN was unset or empty, so the build fell back to the placeholder default and ships untelemetered.'),
  );
  process.exit(1);
}

// A build carrying the right token alongside a wrong one still sends traffic to
// the wrong project, so presence of the expected token is not on its own a pass.
if (foreign.length > 0) {
  console.error(
    `::error::build output carries ${foreign.length} non-production PostHog token(s) ` +
      `alongside the expected one: ${foreign.map(describe).join('; ')}`,
  );
  process.exit(1);
}

console.log(`PostHog token OK: ${EXPECTED_PREFIX}… and no others present.`);
