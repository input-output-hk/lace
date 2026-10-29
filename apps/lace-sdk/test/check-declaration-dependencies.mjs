// A consumer that lacks a package the published declarations import reads
// every type from it as `any`, and with `skipLibCheck` TypeScript reports
// nothing. Fails when a declaration file imports a package that package.json
// does not declare, when an exact version in package.json differs from a
// copy the build uses, and when package.json pins a package that no
// declaration file imports.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isBuiltin } from 'node:module';
import path from 'node:path';

import ts from 'typescript';

import { channelPublishedPeers } from '../scripts/entries.mjs';

import { CHANNEL } from './channel.mjs';
import { manifest, packageDirectory } from './install-package.mjs';

// Imported by the declarations and left undeclared: they type UI, platform
// and Passport state that a headless Cardano consumer does not use, and
// declaring them would install them for every consumer. Their types are
// `any` where they are not installed.
const UNDECLARED = new Set([
  // Blockfrost response types; a large install for types alone.
  '@blockfrost/blockfrost-js',
  // UI and platform.
  '@react-navigation/native',
  'expo-secure-store',
  'history',
  'i18next',
  'react',
  'react-native',
]);
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[\da-z.-]+)?$/i;
// A consumer resolves Node.js built-in modules and `/// <reference
// types="node" />` through @types/node.
const NODE_TYPES = '@types/node';
// The directory and name of the installed package a module path is in.
const INSTALLED_PACKAGE = /^(.*node_modules\/((?:@[^/]+\/)?[^/]+))\//;

const repositoryRoot = path.resolve(packageDirectory, '../..');
const distributionDirectory = path.join(packageDirectory, 'dist');
const distributionFiles = fs.readdirSync(distributionDirectory);

const packageName = specifier =>
  specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/');

const importers = new Map();
for (const file of distributionFiles.filter(name => name.endsWith('.d.ts'))) {
  const { importedFiles, typeReferenceDirectives, ambientExternalModules } =
    ts.preProcessFile(
      fs.readFileSync(path.join(distributionDirectory, file), 'utf8'),
      true,
      true,
    );
  const names = [
    ...[
      ...importedFiles.map(reference => reference.fileName),
      ...(ambientExternalModules ?? []),
    ]
      .filter(specifier => !/^[./]/.test(specifier))
      .map(specifier =>
        isBuiltin(specifier) ? NODE_TYPES : packageName(specifier),
      ),
    ...typeReferenceDirectives.map(({ fileName }) =>
      fileName === 'node' ? NODE_TYPES : packageName(fileName),
    ),
  ];
  for (const name of names) {
    importers.set(name, new Set([...(importers.get(name) ?? []), file]));
  }
}
assert(importers.size > 0, 'No package imports found in dist/*.d.ts');

// The bundle names the source file of each module it inlines in a
// `//#region` comment, so these are the package copies its code comes from.
const inlinedCopies = new Map();
for (const file of distributionFiles.filter(name => /\.c?js$/.test(name))) {
  const code = fs.readFileSync(path.join(distributionDirectory, file), 'utf8');
  for (const [, modulePath] of code.matchAll(/^\/\/#region (\S+)$/gm)) {
    const [, directory, name] = modulePath.match(INSTALLED_PACKAGE) ?? [];
    if (!name) continue;
    inlinedCopies.set(
      name,
      new Set([
        ...(inlinedCopies.get(name) ?? []),
        path.resolve(packageDirectory, directory),
      ]),
    );
  }
}
assert(inlinedCopies.size > 0, 'No //#region module paths found in dist/*.js');

const readVersion = directory => {
  const manifestPath = path.join(directory, 'package.json');
  return fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).version
    : 'no package';
};

// The published manifest adds the canary-only entries' own optional peers.
const declared = {
  ...manifest.dependencies,
  ...manifest.peerDependencies,
  ...channelPublishedPeers(CHANNEL),
};
const pinned = Object.entries(manifest.dependencies).filter(([, version]) =>
  EXACT_VERSION.test(version),
);
const problems = [
  ...[...importers]
    .filter(([name]) => !(name in declared) && !UNDECLARED.has(name))
    .map(([name, files]) =>
      name === NODE_TYPES
        ? `${[...files].join(
            ', ',
          )} use Node.js built-in modules, which a consumer types with ${NODE_TYPES}: declare it in package.json, or list it in UNDECLARED with the reason`
        : `${[...files].join(
            ', ',
          )} import ${name}: declare it in package.json, inline its types with INLINED_TYPE_PACKAGES in rollup.dts.config.mjs, or list it in UNDECLARED with the reason`,
    ),
  // The stable declarations are a subset of canary's (ADR 66), so an entry
  // only canary declarations import is stale only when canary does not.
  ...[...UNDECLARED]
    .filter(
      name =>
        (CHANNEL === 'canary' && !importers.has(name)) || name in declared,
    )
    .map(name => `${name} is listed as undeclared: remove it from UNDECLARED`),
  ...pinned
    .filter(([name]) => CHANNEL === 'canary' && !importers.has(name))
    .map(
      ([name]) =>
        `${name} is pinned, but no declaration file imports it: remove it from package.json, or give it a version range if the output imports it`,
    ),
  ...pinned
    .filter(([name]) =>
      fs.existsSync(path.join(packageDirectory, 'node_modules', name)),
    )
    .map(
      ([name]) =>
        `apps/lace-sdk/node_modules/${name} exists: the consumer checks would install it in place of the copy the bundle and declarations come from; remove it and reinstall`,
    ),
  // A package that the bundle does not inline, such as a types-only one,
  // comes from the repository root, where the internal packages resolve it.
  ...pinned.flatMap(([name, version]) =>
    [
      ...(inlinedCopies.get(name) ?? [
        path.join(repositoryRoot, 'node_modules', name),
      ]),
    ]
      .map(directory => [directory, readVersion(directory)])
      .filter(([, resolved]) => resolved !== version)
      .map(
        ([directory, resolved]) =>
          `${name} is pinned to ${version}, but ${path.relative(
            packageDirectory,
            directory,
          )}, which the build uses, holds ${resolved}`,
      ),
  ),
];
assert.equal(
  problems.length,
  0,
  `Declaration dependencies:\n  ${problems.join('\n  ')}`,
);
// eslint-disable-next-line no-console -- concise build proof
console.log(
  `Declarations import ${importers.size} packages: ${
    [...importers.keys()].filter(name => name in declared).length
  } declared, ${UNDECLARED.size} listed as undeclared; ${
    pinned.length
  } exact pins match the copies the build uses`,
);
