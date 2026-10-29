// Each entry's declarations and its ESM and CommonJS outputs export the same
// names, and every name the declarations promise as a value exists at run
// time. On canary, every type a Passport export names is exported from the
// experimental entry. On stable, no output file names a canary feature or
// Lace's own apps, nor any name only the canary build exports: a stable export
// or doc comment that mentions one commits the stable API to it (ADR 66).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { readExportDocs } from '../scripts/doc-comments.ts';
import {
  CANARY_ONLY_ENTRIES,
  channelEntryNames,
  entryFiles,
} from '../scripts/entries.mjs';
import {
  canaryOnlyIdentifiers,
  exportSurfaceProblems,
  findMarkers,
  identifierPattern,
  readDeclaredExports,
  readUnexportedTypeReferences,
} from '../scripts/export-surface.ts';
import {
  channelEntries,
  compilerOptions,
  packageDirectory,
} from '../scripts/reach.mjs';

import { CHANNEL } from './channel.mjs';

const distribution = path.join(packageDirectory, 'dist');
const workspaceRoot = path.resolve(packageDirectory, '../..');
const require = createRequire(path.join(packageDirectory, 'package.json'));

/**
 * Words that name a canary feature (Passport, custody accounts and their
 * grants and sponsor, the cNIGHT designation, Midnight beyond its chain name)
 * or Lace's own apps and services (its app names, its support desk, its UI
 * translations).
 */
const CANARY_AND_APP_MARKERS =
  /passport|custody|grantee|cnight|nightdesignation|sponsor|midnight|carbon|lace-extension|lace-mobile|lace-next|zendesk|i18next/i;

/** Lines that may hold a marker, each for its reason. */
const ALLOWED_MARKER_LINES = [
  // The BIP-39 word lists the mnemonic code bundles: "carbon", "midnight" and
  // "sponsor" are English words of them, "carbone" French and "carbono"
  // Portuguese. A line that is the bare word "midnight" is also the chain's
  // name in the failures' list of known blockchains (below).
  /^\s*"?(?:carbon|carbone|carbono|midnight|sponsor)"?,?\s*$/i,
  // Midnight is a public, coming-soon chain, so its name is one of the
  // BlockchainName values, and records keyed by chain (BlockchainNetworks and
  // the network state built from it) carry a key for it. Nothing else may name
  // it.
  /^\s*(?:export )?(?:declare )?type BlockchainName = 'Bitcoin' \| 'Cardano' \| 'Midnight';\s*$/,
  /^\s*Midnight\?: \{\s*$/,
];

/**
 * Canary-only export names that are also names the stable output has of its
 * own: the Passport contract exports ActionCreators, Selectors and SideEffect
 * types, the names every contract and module gives its own.
 */
const ALLOWED_CANARY_NAMES = new Set([
  'ActionCreators',
  'Selectors',
  'SideEffect',
  // Midnight re-exports this shared identity; stable Cardano already uses it
  // internally for its networks and accounts. It is not a Midnight feature.
  'BlockchainNetworkId',
]);

const problems = [];
for (const entry of channelEntryNames(CHANNEL)) {
  const declared = readDeclaredExports(
    path.join(distribution, `${entry}.d.ts`),
  );
  const esm = await import(
    pathToFileURL(path.join(distribution, `${entry}.js`)).href
  );
  problems.push(
    ...exportSurfaceProblems({
      entry,
      declared,
      runtime: {
        ESM: Object.keys(esm),
        CommonJS: Object.keys(require(path.join(distribution, `${entry}.cjs`))),
      },
    }),
  );
}

if (CHANNEL === 'canary') {
  // The Passport exports: those of src/passport/index.ts, and the members its
  // modules add to the experimental entry's `m`.
  const passportExports = readExportDocs({
    entries: ['src/passport/index.ts', 'src/passport/modules.ts'].map(file =>
      path.join(packageDirectory, file),
    ),
    options: compilerOptions('canary'),
    workspaceRoot,
  }).map(({ entry, name }) =>
    entry.endsWith('src/passport/modules.ts') ? `m.${name}` : name,
  );
  problems.push(
    ...readUnexportedTypeReferences(
      path.join(distribution, 'experimental.d.ts'),
      passportExports,
    ).map(
      ({ owner, type }) =>
        `experimental: '${owner}' names '${type}', which the entry does not export`,
    ),
  );
}

if (CHANNEL === 'stable') {
  // The stable package does not declare a canary-only entry, so its build
  // writes none of the entry's files either.
  for (const { name } of CANARY_ONLY_ENTRIES) {
    for (const file of entryFiles(name)) {
      if (fs.existsSync(path.join(distribution, file))) {
        problems.push(`${file}: the stable build writes a canary-only entry`);
      }
    }
  }
  const exportNames = channel =>
    readExportDocs({
      entries: channelEntries(channel),
      options: compilerOptions(channel),
      workspaceRoot,
    }).map(({ name }) => name);
  const canaryOnlyNames = identifierPattern(
    canaryOnlyIdentifiers({
      stable: exportNames('stable'),
      canary: exportNames('canary'),
      allowed: ALLOWED_CANARY_NAMES,
    }),
  );
  for (const file of fs.readdirSync(distribution).sort()) {
    if (!/\.(?:c?js|d\.ts)$/.test(file)) continue;
    const text = fs.readFileSync(path.join(distribution, file), 'utf8');
    problems.push(
      ...[
        ...findMarkers(text, CANARY_AND_APP_MARKERS, ALLOWED_MARKER_LINES),
        ...(canaryOnlyNames ? findMarkers(text, canaryOnlyNames) : []),
      ].map(marker => `${file}:${marker}`),
    );
  }
}

assert.equal(
  problems.length,
  0,
  `Export surface (${CHANNEL}):\n  ${problems.join('\n  ')}`,
);
// eslint-disable-next-line no-console -- concise build proof
console.log(
  `Export surface (${CHANNEL}): declarations and both outputs agree${
    CHANNEL === 'stable'
      ? ', and no output names a canary feature, an app or a canary-only export'
      : ''
  }`,
);
