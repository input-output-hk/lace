// Installed-package fixtures expose missing dependencies that the monorepo masks.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { CANARY_ONLY_ENTRIES, channelEntryNames } from '../scripts/entries.mjs';

import { CHANNEL } from './channel.mjs';
import {
  findInstalledDependency,
  packageDirectory,
  withInstalledPackage,
} from './install-package.mjs';

// The canary build type-checks a fixture's .canary twin where one exists. A
// canary-only entry's fixture has none: only the canary build has the entry
// (scripts/entries.mjs).
const FIXTURES = [
  'cardano',
  'bitcoin',
  ...(CHANNEL === 'canary' ? CANARY_ONLY_ENTRIES.map(({ name }) => name) : []),
].map(entry =>
  CHANNEL === 'canary' &&
  fs.existsSync(
    path.join(packageDirectory, 'test', `${entry}-consumer-types.canary.mts`),
  )
    ? `${entry}-consumer-types.canary.mts`
    : `${entry}-consumer-types.mts`,
);
const RESOLUTIONS = {
  node16: { module: 'Node16', moduleResolution: 'Node16' },
  bundler: { module: 'ESNext', moduleResolution: 'Bundler' },
};

// A missing external declaration can silently turn a public alias into any
// under skipLibCheck. Probe every explicit public type export from the source.
const source = ts.createSourceFile(
  'midnight.ts',
  fs.readFileSync(path.join(packageDirectory, 'src/midnight.ts'), 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
const publicTypes = source.statements.flatMap(statement => {
  if (
    !ts.isExportDeclaration(statement) ||
    !statement.exportClause ||
    !ts.isNamedExports(statement.exportClause)
  )
    return [];
  return statement.exportClause.elements
    .filter(element => statement.isTypeOnly || element.isTypeOnly)
    .map(element => element.name.text);
});
const aliasProbe = [
  "import type * as Midnight from '@laceio/sdk/midnight';",
  'type IsAny<T> = 0 extends (1 & T) ? true : false;',
  'type Concrete<T extends false> = T;',
  ...publicTypes.map(
    name =>
      `type Probe_${name} = Concrete<IsAny<Midnight.${name}${
        name === 'Result' ? '<unknown, Error>' : ''
      }>>;`,
  ),
].join('\n');

// Compile every TypeScript sample of the Midnight guide, supplying only the
// application context the samples leave to the host. Imports remain at
// module scope. The guide documents the canary build and is not published.
const guide = fs.readFileSync(
  path.join(packageDirectory, 'docs/midnight.md'),
  'utf8',
);
const guideExamples = [];
for (const [, snippet] of guide.matchAll(
  /^```(?:typescript|ts)\n([\s\S]*?)^```/gm,
)) {
  const parsed = ts.createSourceFile(
    'example.mts',
    snippet,
    ts.ScriptTarget.Latest,
    true,
  );
  const imports = parsed.statements.filter(ts.isImportDeclaration);
  const body = parsed.statements.filter(
    statement => !ts.isImportDeclaration(statement),
  );
  guideExamples.push(
    [
      "import * as sdk from '@laceio/sdk/midnight';",
      ...imports.map(statement => statement.getFullText(parsed)),
      'declare const words: string[];',
      'declare const password: Uint8Array;',
      'declare const entity: sdk.InMemoryWallet;',
      'declare const accountId: sdk.MidnightAccountId;',
      "const exampleWallet = () => sdk.createLaceWallet({ modules: [sdk.m.featureDev, sdk.m.storageInMemory, sdk.createMidnightModule({ password })] as const, environment: 'development', config: { defaultMidnightTestnetNetworkId: sdk.MidnightSDKNetworkIds.Preview } });",
      'declare const wallet: Awaited<ReturnType<typeof exampleWallet>>;',
      'export const example = async () => {',
      ...body.map(statement => statement.getFullText(parsed)),
      '};',
    ].join('\n'),
  );
}
if (CHANNEL === 'canary')
  assert(guideExamples.length > 0, 'No Midnight guide examples found');

const tsc = path.join(findInstalledDependency('typescript'), 'bin/tsc');
for (const entry of channelEntryNames(CHANNEL)) {
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(packageDirectory, 'dist', `${entry}.d.ts`),
      'utf8',
    ),
    /["']type-fest\/source\/tagged(?:\.js)?["']/,
    `${entry} must use public type-fest branding types`,
  );
}
await withInstalledPackage('lace-sdk-consumer-types-', installDirectory => {
  const exampleFixtures = (CHANNEL === 'canary' ? guideExamples : []).map(
    (source, index) => {
      const name = `midnight-guide-${index}.mts`;
      fs.writeFileSync(path.join(installDirectory, name), source);
      return name;
    },
  );
  const aliasFixture = 'midnight-public-aliases.mts';
  if (CHANNEL === 'canary')
    fs.writeFileSync(path.join(installDirectory, aliasFixture), aliasProbe);
  for (const FIXTURE of FIXTURES) {
    fs.copyFileSync(
      path.join(packageDirectory, 'test', FIXTURE),
      path.join(installDirectory, FIXTURE),
    );
    for (const [resolution, moduleOptions] of Object.entries(RESOLUTIONS)) {
      const project = path.join(
        installDirectory,
        `tsconfig.${resolution}.json`,
      );
      fs.writeFileSync(
        project,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            ...moduleOptions,
            strict: true,
            noEmit: true,
            // The SDK and @cardano-sdk declarations do not pass a full check.
            skipLibCheck: true,
            types: [],
          },
          files:
            FIXTURE === 'midnight-consumer-types.mts'
              ? [FIXTURE, aliasFixture, ...exampleFixtures]
              : [FIXTURE],
        }),
      );
      const run = spawnSync(process.execPath, [tsc, '-p', project], {
        encoding: 'utf8',
      });
      assert.equal(
        run.status,
        0,
        `${FIXTURE} does not type-check with ${resolution} module resolution:\n${run.stdout}${run.stderr}`,
      );
    }
  }
});
// eslint-disable-next-line no-console -- concise build proof
console.log(
  `${FIXTURES.join(
    ' and ',
  )} type-check against the installed package with ${Object.keys(
    RESOLUTIONS,
  ).join(' and ')} module resolution`,
);
