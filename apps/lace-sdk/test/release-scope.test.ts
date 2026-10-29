import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  binaryOwners,
  buildCommands,
  buildTargetOf,
  buildTargetSeeds,
  importsOf,
  lockSignature,
  packageOfSpecifier,
  resolveIn,
  signatureChanges,
  type Lockfile,
} from '../scripts/dependency-scope';
import { reachedOwnSource } from '../scripts/reach.mjs';
import { internalTermFindings } from '../scripts/release-notes-check';
import {
  cleanTitle,
  dependencyLineChanges,
  type Fragment,
  fragmentProblems,
  fragmentsOf,
  fragmentsSince,
  isBuildTargetUnchanged,
  otherChannelSource,
  type NotesApi,
  parseFragment,
  pullRequestFragments,
  renderNotes,
  renderPublicNotes,
  workspaceManifestChanges,
} from '../scripts/release-scope';

const lock = (packages: Lockfile['packages']): Lockfile => ({ packages });

const BASE = lock({
  'node_modules/rxjs': { version: '7.8.1', dependencies: { tslib: '^2.1.0' } },
  'node_modules/tslib': { version: '2.6.0' },
  'node_modules/react': { version: '18.2.0' },
  'node_modules/@lace-lib/core': { link: true },
  'packages/lib/core/node_modules/bignumber.js': { version: '9.0.1' },
  'node_modules/bignumber.js': { version: '9.3.1' },
});

describe('the dependencies the family reaches', () => {
  it('reads the package a bare specifier names', () => {
    expect(packageOfSpecifier('rxjs/operators')).toBe('rxjs');
    expect(packageOfSpecifier('@cardano-sdk/core/dist/x')).toBe(
      '@cardano-sdk/core',
    );
    expect(packageOfSpecifier('./local')).toBeUndefined();
    expect(packageOfSpecifier('node:fs')).toBeUndefined();
    expect(
      importsOf("import { a } from 'rxjs';\nexport * from './b';"),
    ).toEqual(['rxjs', './b']);
  });

  it('resolves as npm does, from the importing package up', () => {
    expect(resolveIn(BASE, 'packages/lib/core', 'bignumber.js')).toBe(
      'packages/lib/core/node_modules/bignumber.js',
    );
    expect(resolveIn(BASE, 'apps/lace-sdk', 'bignumber.js')).toBe(
      'node_modules/bignumber.js',
    );
    expect(resolveIn(BASE, '', 'missing')).toBeUndefined();
  });

  it('closes over dependencies, skips workspace links and the packages nothing reaches', () => {
    const signature = lockSignature(BASE, [
      { from: 'apps/lace-sdk', name: 'rxjs' },
      { from: 'apps/lace-sdk', name: '@lace-lib/core' },
    ]);
    expect([...signature.keys()].sort()).toEqual([
      'node_modules/rxjs',
      'node_modules/tslib',
    ]);
  });

  it('follows a peer, but not one its entry marks optional', () => {
    const withPeers = lock({
      ...BASE.packages,
      'node_modules/env-utils': {
        version: '1.2.0',
        peerDependencies: { react: '*', tslib: '^2.6.2' },
        peerDependenciesMeta: { react: { optional: true } },
      },
    });
    const signature = lockSignature(withPeers, [
      { from: 'apps/lace-cardano-trezor', name: 'env-utils' },
    ]);
    expect([...signature.keys()].sort()).toEqual([
      'node_modules/env-utils',
      'node_modules/tslib',
    ]);
  });

  it('counts a lockfile change only where a reached entry differs', () => {
    const seeds = [{ from: 'apps/lace-sdk', name: 'rxjs' }];
    const reactBump = lock({
      ...BASE.packages,
      'node_modules/react': { version: '19.0.0' },
    });
    expect(
      signatureChanges(
        lockSignature(BASE, seeds),
        lockSignature(reactBump, seeds),
      ),
    ).toEqual([]);
    const tslibBump = lock({
      ...BASE.packages,
      'node_modules/tslib': { version: '2.8.1' },
    });
    expect(
      signatureChanges(
        lockSignature(BASE, seeds),
        lockSignature(tslibBump, seeds),
      ),
    ).toEqual(['node_modules/tslib']);
  });

  it('counts a root override only when it names a package reached', () => {
    const seeds = [{ from: '', name: 'rxjs' }];
    expect(
      signatureChanges(
        lockSignature(BASE, seeds, { react: '18.3.0' }),
        lockSignature(BASE, seeds, { react: '19.0.0' }),
      ),
    ).toEqual([]);
    expect(
      signatureChanges(
        lockSignature(BASE, seeds, { 'tslib@2': '2.6.0' }),
        lockSignature(BASE, seeds, { 'tslib@2': '2.8.1' }),
      ),
    ).toEqual(['overrides:tslib@2']);
  });
});

describe("a channel's release", () => {
  // The first call compiles both channels' builds, about 15 s alone and
  // twice that beside the suite's other workers; later calls reuse them.
  it(
    'leaves out the SDK source only the other channel reaches',
    { timeout: 120_000 },
    () => {
      const canaryOnly = otherChannelSource(['stable']);
      expect(canaryOnly.has('apps/lace-sdk/src/experimental.canary.ts')).toBe(
        true,
      );
      expect(canaryOnly.has('apps/lace-sdk/src/index.ts')).toBe(false);
      expect(
        otherChannelSource(['canary']).has('apps/lace-sdk/src/index.ts'),
      ).toBe(false);
    },
  );

  it('leaves out nothing for a release of both channels', () => {
    expect(otherChannelSource(['canary', 'stable']).size).toBe(0);
  });

  it("finds the canary entries in the canary build's own source alone", () => {
    const stable = reachedOwnSource('stable');
    const canaryEntries = [...reachedOwnSource('canary')].filter(file =>
      file.endsWith('.canary.ts'),
    );
    expect(canaryEntries.length).toBeGreaterThan(0);
    for (const file of canaryEntries) expect(stable.has(file)).toBe(false);
  });
});

describe('the manifests of reached workspace packages', () => {
  const VENDOR = 'packages/lib/vendor/package.json';
  const reached = new Set(['packages/lib/vendor/src/index.ts']);
  const before = {
    name: '@lace-lib/vendor',
    version: '0.0.0',
    description: 'Vendored modules',
    scripts: { build: 'tsc' },
    main: './src/index.ts',
    exports: { '.': './src/index.ts', './bip39': './src/bip39.ts' },
    sideEffects: false,
  };
  const changes = (after: Record<string, unknown>, files = [VENDOR]) =>
    workspaceManifestChanges({
      files,
      reached,
      before: () => before,
      after: () => after,
    });

  it('counts a change to a field that decides what bundles, with the third-party dependencies unchanged', () => {
    // The lockfile links a workspace package, so its signature cannot see this.
    expect(
      signatureChanges(
        lockSignature(BASE, [{ from: '', name: '@lace-lib/core' }]),
        lockSignature(BASE, [{ from: '', name: '@lace-lib/core' }]),
      ),
    ).toEqual([]);
    expect(
      changes({
        ...before,
        exports: { ...before.exports, './bip39': './src/bip39-legacy.ts' },
      }),
    ).toEqual([`${VENDOR} (exports)`]);
    expect(changes({ ...before, sideEffects: true })).toEqual([
      `${VENDOR} (sideEffects)`,
    ]);
    expect(
      changes({ ...before, main: './dist/index.js', type: 'module' }),
    ).toEqual([`${VENDOR} (main, type)`]);
  });

  it('skips a change to the version, description or scripts alone', () => {
    expect(
      changes({
        ...before,
        version: '0.0.1',
        description: 'Modules vendored for the SDK',
        scripts: { build: 'tsc -b' },
      }),
    ).toEqual([]);
  });

  it('skips the manifests of packages the builds do not reach', () => {
    expect(
      changes({ ...before, sideEffects: true }, [
        'packages/lib/other/package.json',
      ]),
    ).toEqual([]);
  });
});

describe("a family dependency's line", () => {
  const app = (directory: string) =>
    path.resolve(import.meta.dirname, '../..', directory);

  it('ships a package whose range on a family dependency moves to a new line', () => {
    expect(
      dependencyLineChanges(
        app('lace-sdk'),
        '@laceio/cardano@0.1.3 @laceio/cardano-ledger@0.1.0',
        '@laceio/cardano@0.2.0 @laceio/cardano-ledger@0.2.0',
      ),
    ).toEqual(['dependency line: @laceio/cardano@0.1.3→0.2.0']);
    expect(
      dependencyLineChanges(
        app('lace-cardano-ledger'),
        '@laceio/cardano@0.1.3',
        '@laceio/cardano@0.2.0-canary.0',
      ),
    ).toEqual(['dependency line: @laceio/cardano@0.1.3→0.2.0-canary.0']);
  });

  it('ships nothing for a move within the line, or a package it does not depend on', () => {
    expect(
      dependencyLineChanges(
        app('lace-sdk'),
        '@laceio/cardano@0.1.3',
        '@laceio/cardano@0.1.9',
      ),
    ).toEqual([]);
    expect(
      dependencyLineChanges(
        app('lace-cardano'),
        '@laceio/sdk@0.1.0',
        '@laceio/sdk@0.2.0',
      ),
    ).toEqual([]);
    expect(
      dependencyLineChanges(app('lace-sdk'), undefined, undefined),
    ).toEqual([]);
  });
});

describe('a change to a family project.json', () => {
  const CARDANO = 'apps/lace-cardano/project.json';
  const before = {
    tags: ['scope:sdk'],
    targets: { build: { command: 'tsdown', options: { cwd: 'apps/x' } } },
  };
  const unchanged = (after: Record<string, unknown>, file = CARDANO) =>
    isBuildTargetUnchanged(
      file,
      () => before,
      () => after,
    );

  it('ships nothing when only the tags or dependency hints change', () => {
    expect(
      unchanged({
        ...before,
        tags: ['scope:sdk', 'package:public'],
        implicitDependencies: ['!lace-sdk'],
      }),
    ).toBe(true);
  });

  it('ships when the build target changes', () => {
    expect(
      unchanged({
        ...before,
        targets: { build: { command: 'tsdown --minify' } },
      }),
    ).toBe(false);
  });

  it('leaves other projects to the shipping paths', () => {
    expect(unchanged(before, 'packages/lib/vendor/project.json')).toBe(false);
  });
});

describe('the tools the build targets run', () => {
  it('reads the programs, npx targets and node scripts of a build script', () => {
    expect(
      buildCommands(
        [
          '#!/usr/bin/env bash',
          'set -euo pipefail',
          'node scripts/check.mjs',
          'SDK_CHANNEL=stable npx tsdown --config x',
          '  tsc -p tsconfig.json && npx rollup -c r.mjs # bundle',
        ].join('\n'),
      ),
    ).toEqual({
      binaries: ['rollup', 'set', 'tsc', 'tsdown'],
      packages: [],
      scripts: ['scripts/check.mjs'],
      shellScripts: [],
      configs: ['r.mjs', 'x'],
    });
  });

  it.each([
    ['npm exec', 'npm exec -- tsdown --watch', { binaries: ['tsdown'] }],
    [
      'npm exec with options',
      'npm exec --yes rollup -c',
      { binaries: ['rollup'] },
    ],
    ['npm x', 'npm x tsc', { binaries: ['tsc'] }],
    [
      'npx -p',
      'npx -p typescript@5.9.3 tsc -p .',
      { binaries: ['tsc'], packages: ['typescript'] },
    ],
    [
      'npx --package=',
      'npx --package=@scope/tool@1 run',
      { binaries: ['run'], packages: ['@scope/tool'] },
    ],
    ['env', 'env NODE_ENV=production tsdown', { binaries: ['tsdown'] }],
    ['exec and time', 'exec time tsc', { binaries: ['tsc'] }],
    [
      'a .bin path',
      '../../node_modules/.bin/tsdown --config x',
      { binaries: ['tsdown'], configs: ['x'] },
    ],
    ['sh', 'sh scripts/build.sh', { shellScripts: ['scripts/build.sh'] }],
    [
      './',
      './scripts/build.sh && ./scripts/pack.mjs',
      {
        shellScripts: ['./scripts/build.sh'],
        scripts: ['./scripts/pack.mjs'],
      },
    ],
  ])('reads %s', (_form, script, expected) => {
    expect(buildCommands(script)).toEqual({
      binaries: [],
      packages: [],
      scripts: [],
      shellScripts: [],
      configs: [],
      ...expected,
    });
  });

  const owners = new Map([
    ['tsdown', 'tsdown'],
    ['tsc', 'typescript'],
  ]);
  const files: Record<string, string> = {
    'apps/x/project.json': '',
    'apps/x/scripts/build.sh':
      'cd "$(dirname "$0")/.."\nnode scripts/check.mjs\nsh scripts/inner.sh',
    'apps/x/scripts/inner.sh': 'npx tsdown',
    'apps/x/scripts/check.mjs':
      "import ts from 'typescript';\nimport './lib.mjs';",
    'apps/x/scripts/lib.mjs': "import { x } from 'rollup';",
    'apps/x/tsdown.config.ts':
      "import polyfills from '@rolldown/plugin-node-polyfills';",
  };
  const seedsOf = (commands: string[], extra: Record<string, string> = {}) =>
    buildTargetSeeds({
      target: { app: 'apps/x', commands, cwd: 'apps/x' },
      read: file => ({ ...files, ...extra }[file]),
      configs: ['tsdown.config.ts'],
      owners,
      hasPackage: name => name === 'typescript',
    });

  it('follows the scripts a target runs, and their imports, to the tools', () => {
    expect(
      seedsOf(['bash scripts/build.sh'])
        .map(({ from, name }) => `${from || '(root)'} ${name}`)
        .sort(),
    ).toEqual([
      '(root) tsdown',
      'apps/x @rolldown/plugin-node-polyfills',
      'apps/x rollup',
      'apps/x typescript',
    ]);
  });

  it("seeds only the build tools' configuration, not a test runner's or a linter's", () => {
    const seeds = buildTargetSeeds({
      target: {
        app: 'apps/x',
        commands: ['npx tsdown && npx rollup -c rollup.dts.config.mjs'],
        cwd: 'apps/x',
      },
      read: file =>
        ({
          'apps/x/tsdown.config.ts': "import a from 'tsdown-plugin';",
          'apps/x/rollup.dts.config.mjs':
            "import dts from 'rollup-plugin-dts';",
          'apps/x/vitest.config.ts':
            "import { defineConfig } from 'vitest/config';",
          'apps/x/eslint.config.mjs': "import lint from 'eslint-plugin-x';",
        }[file]),
      configs: ['eslint.config.mjs', 'tsdown.config.ts', 'vitest.config.ts'],
      owners: new Map([
        ['tsdown', 'tsdown'],
        ['rollup', 'rollup'],
      ]),
      hasPackage: () => false,
    }).map(({ name }) => name);
    expect(seeds.sort()).toEqual([
      'rollup',
      'rollup-plugin-dts',
      'tsdown',
      'tsdown-plugin',
    ]);
  });

  it('refuses a script the target runs that does not exist', () => {
    expect(() => seedsOf(['bash scripts/missing.sh'])).toThrow(
      /runs scripts\/missing\.sh, which does not exist/,
    );
    expect(() => seedsOf(['npx tsdown && node scripts/gone.mjs'])).toThrow(
      /runs scripts\/gone\.mjs, which does not exist/,
    );
  });

  it('refuses a target that runs no tool of the lockfile', () => {
    expect(() => seedsOf(['echo building'])).toThrow(
      /runs no tool the lockfile provides/,
    );
    expect(seedsOf(['npx -p typescript tsc'])).toContainEqual({
      from: '',
      name: 'typescript',
    });
  });

  it('reads options.command or options.commands, and refuses neither', () => {
    expect(
      buildTargetOf('apps/x', {
        targets: { build: { options: { command: 'bash scripts/build.sh' } } },
      }),
    ).toEqual({
      app: 'apps/x',
      commands: ['bash scripts/build.sh'],
      cwd: 'apps/x',
    });
    expect(
      buildTargetOf('apps/x', {
        targets: {
          build: {
            options: {
              commands: ['npx tsdown', { command: 'tsc -p .' }],
              cwd: 'apps/x/sub',
            },
          },
        },
      }),
    ).toEqual({
      app: 'apps/x',
      commands: ['npx tsdown', 'tsc -p .'],
      cwd: 'apps/x/sub',
    });
    expect(() => buildTargetOf('apps/x', { targets: {} })).toThrow(
      /runs no command/,
    );
  });

  it('maps a binary to the root package whose bin provides it', () => {
    const owners = binaryOwners({
      packages: {
        'node_modules/typescript': {
          version: '5.9.3',
          bin: { tsc: 'bin/tsc', tsserver: 'bin/tsserver' },
        },
        'node_modules/tsdown': { version: '0.15.0', bin: 'dist/run.js' },
        'node_modules/a/node_modules/tsc-shadow': { bin: { tsc: 'x' } },
      } as Lockfile['packages'],
    });
    expect(owners.get('tsc')).toBe('typescript');
    expect(owners.get('tsdown')).toBe('tsdown');
    expect(owners.get('set')).toBeUndefined();
  });

  it('counts a lockfile-only bump of a build tool', () => {
    const seeds = [{ from: '', name: 'tsdown' }];
    const before = lock({ 'node_modules/tsdown': { version: '0.15.0' } });
    const after = lock({ 'node_modules/tsdown': { version: '0.15.1' } });
    expect(
      signatureChanges(
        lockSignature(before, seeds),
        lockSignature(after, seeds),
      ),
    ).toEqual(['node_modules/tsdown']);
  });
});

describe('ticket references and internal terms', () => {
  it('drops ticket references from titles', () => {
    expect(cleanTitle('fix: deploy the prover [LW-123]')).toBe(
      'fix: deploy the prover',
    );
    expect(cleanTitle('fix(lw-456): keep the form in view [LW-456]')).toBe(
      'fix: keep the form in view',
    );
    expect(cleanTitle('LW-123: wallet sync')).toBe('wallet sync');
    expect(
      cleanTitle(
        'fix: resolve cNIGHT launch funding and fee blockers [LW-15307, LW-15395]',
      ),
    ).toBe('fix: resolve cNIGHT launch funding and fee blockers');
    expect(cleanTitle('fix: a fee (LW-1001,LW-2002)')).toBe('fix: a fee');
    expect(cleanTitle('[LW-15002] - Sheet flow navigation')).toBe(
      'Sheet flow navigation',
    );
    // Unhyphenated and branch-name forms.
    expect(cleanTitle('feat: show the balance [LW 789]')).toBe(
      'feat: show the balance',
    );
    expect(cleanTitle('[LW1001] add a contact list')).toBe(
      'add a contact list',
    );
    expect(cleanTitle('Lw 2002/the address book view')).toBe(
      'the address book view',
    );
    expect(cleanTitle('Feat/lw 3003 tidy the summary')).toBe(
      'tidy the summary',
    );
    expect(cleanTitle('Feat/lw 4004 rename a setting')).toBe(
      'rename a setting',
    );
    expect(cleanTitle('feat(sdk)!: an entry (LW-9001)')).toBe(
      'feat(sdk)!: an entry',
    );
  });

  it('finds every form of a ticket reference', () => {
    for (const reference of [
      'LW-123',
      'LW 789',
      'LW1001',
      'lw_2002',
      'lace-1234',
    ]) {
      expect(internalTermFindings(`- fix: ${reference}`)).toHaveLength(1);
    }
    expect(
      internalTermFindings('- feat: lace next, 3 wallets, Lace 2.4.1'),
    ).toEqual([]);
  });

  it('finds internal terms in text', () => {
    const notes = renderNotes({
      ref: 'lace-sdk@0.1.0',
      changes: [
        { sha: 'a'.repeat(40), number: 1, title: 'feat: follow ADR 66' },
        { sha: 'b'.repeat(40), number: 2, title: 'fix: as discussed on Slack' },
        { sha: 'c'.repeat(40), number: 3, title: 'feat: a wallet' },
      ],
    });
    expect(internalTermFindings(notes)).toEqual([
      expect.stringContaining('ADR'),
      expect.stringContaining('slack'),
    ]);
    expect(
      internalTermFindings('## Changes\n\n- feat: a wallet (#3)\n'),
    ).toEqual([]);
  });
});

describe('the public release notes', () => {
  const api = {
    tag: 'lace-sdk@0.2.0',
    version: '0.2.0',
    channel: 'stable',
    previous: 'lace-sdk@0.1.4',
    bump: 'breaking',
    added: ['cardano:openWallet'],
    removed: ['cardano:legacyWallet'],
    changed: ['index:createWallet'],
    compatible: ['index:Options'],
  };

  it('carry the version, the API, the docs and the packages', () => {
    const notes = renderPublicNotes(api);
    expect(notes).toContain('## lace-sdk@0.2.0');
    expect(notes).toContain(
      'Compared with `lace-sdk@0.1.4`: a breaking change.',
    );
    expect(notes).toContain('- Removed: `cardano:legacyWallet`');
    expect(notes).toContain('- Declared compatible: `index:Options`');
    expect(notes).toContain('https://sdk.lace.io/v/0.2.0/');
    expect(notes).toContain(
      'https://www.npmjs.com/package/@laceio/cardano-trezor/v/0.2.0',
    );
    expect(
      renderPublicNotes({
        ...api,
        tag: 'lace-sdk@0.2.0-canary.3',
        version: '0.2.0-canary.3',
        channel: 'canary',
      }),
    ).toContain('https://sdk.lace.io/canary/');
    expect(
      renderPublicNotes({
        ...api,
        previous: null,
        added: ['index:a', 'index:b'],
      }),
    ).toContain('The first release, with 2 stable exports.');
  });

  it("describe a canary by its canary build's changes", () => {
    // The stable diff misses a change to a canary-only entry, such as
    // `./experimental`: a canary's notes say what its own build changed.
    const canary = {
      ...api,
      tag: 'lace-sdk@0.1.1-canary.1',
      version: '0.1.1-canary.1',
      channel: 'canary',
      previous: 'lace-sdk@0.1.0',
      bump: 'patch',
      base: '0.1.1',
      added: [],
      removed: [],
      changed: [],
      compatible: [],
      canary: {
        previous: 'lace-sdk@0.1.1-canary.0',
        added: ['experimental:GranteeScheme'],
        removed: [],
        changed: ['experimental:PassportAgentPolicy'],
      },
    };
    for (const notes of [
      renderPublicNotes(canary),
      renderNotes({ ref: 'lace-sdk@0.1.1-canary.0', changes: [], api: canary }),
    ]) {
      expect(notes).toContain(
        "The canary build, compared with `lace-sdk@0.1.1-canary.0`'s:",
      );
      expect(notes).toContain('- Added: `experimental:GranteeScheme`');
      expect(notes).toContain('- Changed: `experimental:PassportAgentPolicy`');
      expect(notes).toContain(
        'It previews `0.1.1`: the stable API takes a patch change since `lace-sdk@0.1.0`.',
      );
      expect(notes).not.toContain('Compared with `lace-sdk@0.1.0`');
    }
    // A canary build that changes no export says so in a line.
    const unchanged: NotesApi = {
      ...canary,
      canary: { ...canary.canary, added: [], changed: [] },
    };
    const notes = renderPublicNotes(unchanged);
    expect(notes).toContain(
      "The canary build, compared with `lace-sdk@0.1.1-canary.0`'s: no export changed.",
    );
    expect(notes).not.toContain('- Added:');
    expect(notes).toContain('It previews `0.1.1`');
    // Without its canary build's diff, a canary reads as before.
    const { canary: _, ...withoutDiff } = canary;
    expect(renderPublicNotes(withoutDiff)).toContain(
      'Compared with `lace-sdk@0.1.0`: a patch change; no export changed.',
    );
  });

  it("names a package's previous release by the package's own version", () => {
    const api: NotesApi = {
      tag: '@laceio/cardano@0.1.1',
      package: '@laceio/cardano',
      version: '0.1.1',
      channel: 'stable',
      previous: 'lace-sdk@0.1.0',
      bump: 'patch',
      added: [],
      removed: [],
      changed: [],
      compatible: [],
    };
    // Its previous version was the family's release.
    expect(renderPublicNotes(api)).toContain(
      'Compared with `@laceio/cardano@0.1.0` (released as `lace-sdk@0.1.0`): a patch change; no export changed.',
    );
    expect(
      renderNotes({
        ref: 'lace-sdk@0.1.0',
        changes: [],
        package: '@laceio/cardano',
      }),
    ).toContain(
      'No change to what `@laceio/cardano` ships since `@laceio/cardano@0.1.0` (released as `lace-sdk@0.1.0`).',
    );
    // Its own release names itself.
    expect(
      renderPublicNotes({
        ...api,
        tag: '@laceio/cardano@0.1.2',
        version: '0.1.2',
        previous: '@laceio/cardano@0.1.1',
        changed: ['index:Serialization'],
      }),
    ).toContain('Compared with `@laceio/cardano@0.1.1`: a patch change.');
  });

  it('names a package released on its own', () => {
    const notes = (ref?: string) =>
      renderNotes({ ref, changes: [], package: '@laceio/cardano' });
    expect(notes()).toContain('The first release of `@laceio/cardano`.');
    expect(notes('@laceio/cardano@0.1.0')).toContain(
      'No change to what `@laceio/cardano` ships since `@laceio/cardano@0.1.0`.',
    );
    expect(
      renderNotes({
        ref: '@laceio/cardano@0.1.0',
        changes: [],
        firstCanary: true,
        package: '@laceio/cardano',
      }),
    ).toContain('The first canary of `@laceio/cardano`, with the changes');
  });

  it('name only the package released, and the docs its version has', () => {
    const cardano = renderPublicNotes({
      ...api,
      tag: '@laceio/cardano@0.1.2',
      version: '0.1.2',
      package: '@laceio/cardano',
    });
    expect(cardano).toContain('## @laceio/cardano@0.1.2');
    expect(cardano).toContain(
      'https://www.npmjs.com/package/@laceio/cardano/v/0.1.2',
    );
    expect(cardano).not.toContain('@laceio/cardano-ledger');
    expect(cardano).not.toContain('npmjs.com/package/@laceio/sdk/');
    // Each package's stable release links its own docs archive.
    expect(cardano).toContain('Docs: https://sdk.lace.io/cardano/v/0.1.2/');
    expect(
      renderPublicNotes({
        ...api,
        tag: '@laceio/sdk@0.1.2',
        version: '0.1.2',
        package: '@laceio/sdk',
      }),
    ).toContain('Docs: https://sdk.lace.io/v/0.1.2/');
  });

  it('never name a pull request, a commit or a SHA', () => {
    // Whatever the private notes would list, the public renderer is given
    // the API diff alone and has nowhere to put a change.
    const notes = renderPublicNotes(api);
    expect(notes).not.toMatch(/#\d+/);
    expect(notes).not.toMatch(/\b[0-9a-f]{12,40}\b/);
    expect(notes).not.toMatch(/pull request|merge|commit/i);
    expect(notes).not.toContain('## Changes');
    expect(notes).not.toContain('Dependency updates');
    expect(internalTermFindings(notes)).toEqual([]);
  });
});

describe('changelog fragments', () => {
  const fragment = (
    kind: Fragment['kind'],
    body: string,
    {
      time,
      build = 'stable',
      packageId = 'sdk',
    }: { time: string; build?: Fragment['build']; packageId?: string },
  ) =>
    parseFragment(
      `apps/lace-sdk/.changes/fragments/${kind}-${time}.yaml`,
      `kind: ${kind}\nbody: ${body}\ntime: ${time}\ncustom:\n    Package: ${packageId}\n    Build: ${build}\n`,
    );

  it('read the kind and body changie writes', () => {
    expect(
      parseFragment(
        'apps/lace-sdk/.changes/fragments/Added-1.yaml',
        'kind: Added\nbody: |-\n    Grantees can be secp256k1 keys\n    for agent wallets\ntime: 2026-10-20T18:15:22.47633+01:00\ncustom:\n    Package: sdk\n    Build: canary\n',
      ),
    ).toEqual({
      file: 'apps/lace-sdk/.changes/fragments/Added-1.yaml',
      kind: 'Added',
      body: 'Grantees can be secp256k1 keys\nfor agent wallets',
      packages: ['@laceio/sdk'],
      packageNamed: true,
      build: 'canary',
      time: '2026-10-20T18:15:22.47633+01:00',
    });
  });

  it('read every package for `all`, and every package for a fragment that names none', () => {
    expect(
      fragment('Changed', 'Each package releases on its own', {
        time: '1',
        packageId: 'all',
      }).packages,
    ).toEqual([
      '@laceio/cardano',
      '@laceio/cardano-ledger',
      '@laceio/cardano-trezor',
      '@laceio/sdk',
    ]);
    // One written before fragments named a package lists in every package's
    // notes, and the check asks a change that touches it to name one.
    const unnamed = parseFragment(
      'f.yaml',
      'kind: Fixed\nbody: a fix\ncustom:\n    Build: stable\n',
    );
    expect(unnamed).toMatchObject({ packageNamed: false });
    expect(unnamed.packages).toHaveLength(4);
    expect(fragmentProblems({ shipped: {}, fragments: [unnamed] })).toEqual([
      expect.stringContaining('names no package'),
    ]);
    expect(() =>
      parseFragment(
        'f.yaml',
        'kind: Fixed\nbody: a fix\ncustom:\n    Package: wallet\n    Build: stable\n',
      ),
    ).toThrow('custom.Package must be one of sdk, cardano');
  });

  it("list in a package's notes only the fragments that name it", () => {
    const fragments = [
      fragment('Fixed', 'Signing keeps the change output', { time: '1' }),
      fragment('Fixed', 'Fees round up', { time: '2', packageId: 'cardano' }),
      fragment('Changed', 'Releases on its own', {
        time: '3',
        packageId: 'all',
      }),
    ];
    const bodies = (name?: string) =>
      fragmentsOf(fragments, name).map(({ body }) => body);
    expect(bodies('@laceio/cardano')).toEqual([
      'Fees round up',
      'Releases on its own',
    ]);
    expect(bodies('@laceio/cardano-ledger')).toEqual(['Releases on its own']);
    expect(bodies(undefined)).toHaveLength(3);
  });

  it('refuse an unknown kind, an empty body or no build', () => {
    expect(() =>
      parseFragment('f.yaml', 'kind: Improved\nbody: faster\n'),
    ).toThrow('kind must be one of Added, Changed');
    expect(() => parseFragment('f.yaml', 'kind: Fixed\nbody: ""\n')).toThrow(
      'has no body',
    );
    expect(() =>
      parseFragment(
        'f.yaml',
        'kind: Fixed\nbody: a fix\ncustom:\n    Package: sdk\n',
      ),
    ).toThrow('custom.Build must be stable or canary');
  });

  it("leave a canary-only change out of a stable release's notes", () => {
    const fragments = [
      fragment('Added', 'Spending grants for agent keys', {
        time: '1',
        build: 'canary',
      }),
      fragment('Fixed', 'Signing keeps the change output', { time: '2' }),
    ];
    const api = {
      previous: 'lace-sdk@0.1.0',
      bump: 'patch',
      added: [],
      removed: [],
      changed: [],
      compatible: [],
    };
    const stable = renderPublicNotes({ ...api, channel: 'stable' }, fragments);
    expect(stable).toContain('- Signing keeps the change output');
    expect(stable).not.toContain('Spending grants');
    expect(
      renderPublicNotes({ ...api, channel: 'canary' }, fragments),
    ).toContain('- Spending grants for agent keys');
    expect(
      renderNotes({
        ref: 'lace-sdk@0.1.0',
        changes: [],
        api: { ...api, channel: 'stable' },
        fragments,
      }),
    ).not.toContain('Spending grants');
  });

  it("open both notes, by kind in Keep a Changelog's order", () => {
    const fragments = [
      fragment('Fixed', 'Signing no longer drops the change output', {
        time: '2',
      }),
      fragment('Added', 'Passport grants to secp256k1 keys', { time: '3' }),
      fragment('Added', 'A Bitcoin wallet in the canary build', { time: '1' }),
    ];
    const section = [
      "## What's new",
      '',
      '### Added',
      '',
      '- A Bitcoin wallet in the canary build',
      '- Passport grants to secp256k1 keys',
      '',
      '### Fixed',
      '',
      '- Signing no longer drops the change output',
      '',
    ].join('\n');
    const api = {
      tag: 'lace-sdk@0.1.1',
      version: '0.1.1',
      channel: 'stable',
      previous: 'lace-sdk@0.1.0',
      bump: 'patch',
      added: [],
      removed: [],
      changed: [],
      compatible: [],
    };
    const publicNotes = renderPublicNotes(api, fragments);
    expect(publicNotes).toContain(`A stable release.\n\n${section}\n## API`);
    expect(internalTermFindings(publicNotes)).toEqual([]);
    expect(
      renderNotes({ ref: 'lace-sdk@0.1.0', changes: [], fragments }),
    ).toContain(`${section}\n## Changes`);
    expect(
      renderNotes({ ref: 'lace-sdk@0.1.0', changes: [], fragments }),
    ).toMatch(/^## What's new\n/);
    // Without fragments, the notes read as before.
    expect(renderPublicNotes(api)).not.toContain("What's new");
  });

  it('indent a multi-line entry under its item', () => {
    const notes = renderPublicNotes(
      {
        previous: null,
        bump: 'first',
        added: [],
        removed: [],
        changed: [],
        compatible: [],
      },
      [
        parseFragment(
          'f.yaml',
          'kind: Changed\nbody: |-\n    One line\n    and the next\ncustom:\n    Package: sdk\n    Build: stable\n',
        ),
      ],
    );
    expect(notes).toContain('- One line\n  and the next\n');
  });

  const sdkShips = { '@laceio/sdk': ['apps/lace-sdk/src/index.ts'] };

  it('are required of a change to what ships, and of nothing else', () => {
    const fixed = [fragment('Fixed', 'A fix', { time: '1' })];
    expect(
      fragmentProblems({
        shipped: sdkShips,
        fragments: [],
      }),
    ).toEqual([expect.stringContaining('npx changie new')]);
    expect(
      fragmentProblems({
        shipped: {},
        fragments: [
          fragment('Fixed', 'Signing works again (LW-1234)', { time: '1' }),
        ],
      }),
    ).toEqual([expect.stringContaining('names an internal term')]);
    expect(
      fragmentProblems({
        shipped: sdkShips,
        fragments: fixed,
      }),
    ).toEqual([]);
    expect(fragmentProblems({ shipped: {}, fragments: [] })).toEqual([]);
  });

  it('are required of each package the change reaches', () => {
    const shipped = {
      ...sdkShips,
      '@laceio/cardano': ['packages/lib/cardano-core/src/index.ts'],
      '@laceio/cardano-ledger': [],
    };
    expect(
      fragmentProblems({
        shipped,
        fragments: [fragment('Fixed', 'A fix', { time: '1' })],
      }),
    ).toEqual([expect.stringContaining('`@laceio/cardano` ships')]);
    expect(
      fragmentProblems({
        shipped,
        fragments: [
          fragment('Fixed', 'A fix', { time: '1', packageId: 'all' }),
        ],
      }),
    ).toEqual([]);
  });

  it('count no edit to a fragment a release holds', () => {
    const fixed = [fragment('Fixed', 'A fix', { time: '1' })];
    expect(
      fragmentProblems({
        shipped: sdkShips,
        fragments: fixed,
        released: fixed.map(({ file }) => file),
      }),
    ).toEqual([expect.stringContaining('a release already holds')]);
  });

  describe('in a repository with a release', () => {
    const git = (cwd: string, ...args: string[]) =>
      execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
    const directory = 'apps/lace-sdk/.changes/fragments';
    const write = (repository: string, name: string, body: string) => {
      fs.mkdirSync(path.join(repository, directory), { recursive: true });
      fs.writeFileSync(
        path.join(repository, directory, name),
        `kind: Fixed\nbody: ${body}\ntime: ${name}\ncustom:\n    Package: sdk\n    Build: stable\n`,
      );
    };
    const commit = (repository: string, message: string) => {
      git(repository, 'add', '-A');
      git(repository, 'commit', '-q', '-m', message);
      return git(repository, 'rev-parse', 'HEAD');
    };

    /**
     * main with `Fixed-1.yaml` in the canary `lace-sdk@0.1.0-canary.1` and
     * `Fixed-2.yaml` added after it; `run` gets the repository and main's
     * tip, the base a pull request is compared with.
     */
    const withRepository = (
      run: (repository: string, base: string) => void,
      tag = 'lace-sdk@0.1.0-canary.1',
    ) => {
      const repository = fs.mkdtempSync(
        path.join(os.tmpdir(), 'sdk-fragments-'),
      );
      try {
        git(repository, 'init', '-q', '-b', 'main');
        git(repository, 'config', 'user.email', 'test@example.invalid');
        git(repository, 'config', 'user.name', 'test');
        git(repository, 'config', 'commit.gpgsign', 'false');
        git(repository, 'config', 'tag.gpgsign', 'false');
        write(repository, 'Fixed-1.yaml', 'Signing keeps the change');
        commit(repository, 'a fix');
        git(repository, 'tag', tag);
        write(repository, 'Fixed-2.yaml', 'Fees round up');
        run(repository, commit(repository, 'another fix'));
      } finally {
        fs.rmSync(repository, { recursive: true, force: true });
      }
    };
    const shipped = sdkShips;
    const bodiesSinceCanary = (repository: string) =>
      fragmentsSince('lace-sdk@0.1.0-canary.1', repository).map(
        ({ body }) => body,
      );

    it("refuse an edit to a released fragment, which the next release's notes would leave out", () => {
      withRepository((repository, base) => {
        write(repository, 'Fixed-1.yaml', 'Signing keeps the change output');
        commit(repository, 'refine the fix');
        const touched = pullRequestFragments(base, repository);
        expect(touched.released).toEqual([`${directory}/Fixed-1.yaml`]);
        expect(fragmentProblems({ shipped, ...touched })).toEqual([
          expect.stringContaining('a release already holds'),
        ]);
        expect(bodiesSinceCanary(repository)).toEqual(['Fees round up']);

        write(repository, 'Fixed-3.yaml', 'Signing keeps the change output');
        commit(repository, 'describe the refinement');
        expect(
          fragmentProblems({
            shipped,
            ...pullRequestFragments(base, repository),
          }),
        ).toEqual([]);
        expect(bodiesSinceCanary(repository)).toEqual([
          'Fees round up',
          'Signing keeps the change output',
        ]);
      });
    });

    it("count a package's own release as holding a fragment", () => {
      withRepository((repository, base) => {
        write(repository, 'Fixed-1.yaml', 'Signing keeps the change output');
        commit(repository, 'refine the fix');
        expect(pullRequestFragments(base, repository).released).toEqual([
          `${directory}/Fixed-1.yaml`,
        ]);
      }, '@laceio/sdk@0.1.1-canary.0');
    });

    it('count an edit to a fragment no release holds', () => {
      withRepository((repository, base) => {
        write(repository, 'Fixed-2.yaml', 'Fees round up, never down');
        commit(repository, 'refine the unreleased fix');
        const touched = pullRequestFragments(base, repository);
        expect(touched.released).toEqual([]);
        expect(fragmentProblems({ shipped, ...touched })).toEqual([]);
        expect(bodiesSinceCanary(repository)).toEqual([
          'Fees round up, never down',
        ]);
      });
    });
  });
});

// The release workflow lives in lace-platform alone; the generated public
// repository carries its own, so this reads it only where it exists.
const RELEASE_WORKFLOW = path.resolve(
  import.meta.dirname,
  '../../../.github/workflows/sdk-release.yml',
);

describe.skipIf(!fs.existsSync(RELEASE_WORKFLOW))(
  "the public draft's seed",
  () => {
    const workflow = fs.existsSync(RELEASE_WORKFLOW)
      ? fs.readFileSync(RELEASE_WORKFLOW, 'utf8')
      : '';
    const publish = workflow.slice(
      workflow.indexOf('\n  publish:\n'),
      workflow.indexOf('\n  build-sdk-site:\n'),
    );

    it('is the public notes check-sdk wrote and hashed, and nothing else', () => {
      expect(publish).toContain(
        'name: sdk-public-notes-check-${{ github.run_id }}',
      );
      expect(publish).toContain(
        'EXPECTED_SHA256: ${{ needs.check-sdk.outputs.public_notes_sha256 }}',
      );
      expect(publish).toContain(
        'body_file="$RUNNER_TEMP/notes-artifact/public-release-notes.md"',
      );
      // The private release's body, with its pull requests, is never read.
      expect(publish).not.toMatch(/gh release view[^\n]*--json body/);
      expect(publish).not.toContain('private-release-notes');
    });
  },
);

describe.skipIf(!fs.existsSync(RELEASE_WORKFLOW))(
  'the release a dry run follows',
  () => {
    const workflow = fs.existsSync(RELEASE_WORKFLOW)
      ? fs.readFileSync(RELEASE_WORKFLOW, 'utf8')
      : '';
    // The dry-run-tag job's `Choose the last package's tag` step, as bash
    // runs it.
    const step = workflow.slice(
      workflow.indexOf("- name: Choose the last package's tag"),
    );
    const lines = step.slice(step.indexOf('run: |\n') + 'run: |\n'.length);
    const script = lines
      .split('\n')
      .slice(
        0,
        lines.split('\n').findIndex(line => /^ {0,9}\S/.test(line)),
      )
      .map(line => line.slice(10))
      .join('\n');

    /** The step's output, after the legs in `tags` (index → tag) each recorded theirs. */
    const follow = (tags: Record<number, string>) => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-dry-run-tag-'));
      try {
        const directory = path.join(root, 'version-tags');
        fs.mkdirSync(directory);
        for (const [index, tag] of Object.entries(tags)) {
          fs.writeFileSync(
            path.join(directory, `version-${index}`),
            `${tag}\n`,
          );
        }
        const output = path.join(root, 'output');
        fs.writeFileSync(output, '');
        execFileSync('bash', ['-c', script], {
          encoding: 'utf8',
          env: { ...process.env, GITHUB_OUTPUT: output, RUNNER_TEMP: root },
        });
        return fs.readFileSync(output, 'utf8').trim();
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    };

    it('follows the one package that changed', () => {
      expect(follow({ 3: '@laceio/sdk@0.2.0' })).toBe('tag=@laceio/sdk@0.2.0');
    });

    it('follows the last package, in dependency order, of several that changed', () => {
      expect(
        follow({
          0: '@laceio/cardano@0.1.2',
          2: '@laceio/cardano-trezor@0.1.2',
        }),
      ).toBe('tag=@laceio/cardano-trezor@0.1.2');
    });

    it('follows no release when no package changed', () => {
      expect(follow({})).toBe('tag=');
    });
  },
);

const VERSION_WORKFLOW = path.resolve(
  import.meta.dirname,
  '../../../.github/workflows/sdk-release-version.yml',
);

describe.skipIf(!fs.existsSync(VERSION_WORKFLOW))(
  "the release job's environment",
  () => {
    const workflow = fs.existsSync(VERSION_WORKFLOW)
      ? fs.readFileSync(VERSION_WORKFLOW, 'utf8')
      : '';
    const job = workflow.slice(workflow.indexOf('\n  release:\n'));
    const expression =
      /\n {4}environment: \$\{\{(.*)\}\}\n/.exec(job)?.[1]?.trim() ?? '';

    /**
     * The environment the expression picks for a run. The expression has
     * GitHub's `(a == b && …) && 'x' || 'y'` form, which picks 'x' when every
     * comparison holds and 'y' otherwise.
     */
    const environmentFor = (context: Record<string, string>): string => {
      const form = /^\((.*)\) && '([^']+)' \|\| '([^']+)'$/.exec(expression);
      if (!form)
        throw new Error(`unexpected environment expression: ${expression}`);
      const [, condition = '', chosen, otherwise] = form;
      const value = (operand: string) =>
        /^'.*'$/.test(operand) ? operand.slice(1, -1) : context[operand];
      const isMet = condition.split(' && ').every(comparison => {
        const [left = '', right = ''] = comparison.split(' == ');
        return value(left.trim()) === value(right.trim());
      });
      return (isMet ? chosen : otherwise) ?? '';
    };

    const nightly = {
      'inputs.channel': 'canary',
      'github.event_name': 'schedule',
      'github.run_attempt': '1',
      'github.actor': 'scheduler',
      'github.triggering_actor': 'scheduler',
    };

    it('tags unattended only on the first attempt of the nightly schedule', () => {
      expect(environmentFor(nightly)).toBe('sdk-canary-tag');
    });

    it.each([
      [
        'a stable release',
        {
          ...nightly,
          'inputs.channel': 'stable',
          'github.event_name': 'workflow_dispatch',
        },
      ],
      [
        'a canary dispatched by hand',
        { ...nightly, 'github.event_name': 'workflow_dispatch' },
      ],
      [
        'a re-run of the nightly schedule',
        { ...nightly, 'github.run_attempt': '2' },
      ],
      [
        'a nightly attempt someone else started',
        { ...nightly, 'github.triggering_actor': 'someone' },
      ],
    ])('waits for a release manager on %s', (_case, context) => {
      expect(environmentFor(context)).toBe('sdk-release-tag');
    });

    it('mints one token, for this repository’s contents, and reads no team', () => {
      expect(job.match(/create-github-app-token@/g)).toHaveLength(1);
      expect(job).toContain('permission-contents: write');
      expect(job).not.toMatch(/permission-members|teams\/|memberships/);
    });
  },
);

describe.skipIf(!fs.existsSync(VERSION_WORKFLOW))(
  'the release a canary follows',
  () => {
    const workflow = fs.existsSync(VERSION_WORKFLOW)
      ? fs.readFileSync(VERSION_WORKFLOW, 'utf8')
      : '';
    // The previous job's `Read the releases` step, as bash runs it.
    const step = workflow.slice(workflow.indexOf('- name: Read the releases'));
    const lines = step.slice(step.indexOf('run: |\n') + 'run: |\n'.length);
    const script = lines
      .split('\n')
      .slice(
        0,
        lines.split('\n').findIndex(line => /^ {0,9}\S/.test(line)),
      )
      .map(line => line.slice(10))
      .join('\n');

    const git = (cwd: string, ...args: string[]) =>
      execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

    /**
     * A repository whose main has `releases` (by default a stable release and
     * two canaries), each on its own commit and published a day apart in
     * that order, with GitHub's records of them served by a stand-in `gh`;
     * the step runs at `checkout` (a release, or `main` for its tip) for
     * `expect`.
     */
    const runStep = ({
      checkout,
      expect,
      package: name = '',
      releases = [
        'lace-sdk@0.1.0',
        'lace-sdk@0.2.0-canary.1',
        'lace-sdk@0.2.0-canary.2',
      ],
    }: {
      checkout: string;
      expect: string;
      package?: string;
      releases?: readonly string[];
    }) => {
      const root = fs.mkdtempSync(
        path.join(os.tmpdir(), 'sdk-canary-follows-'),
      );
      try {
        const repository = path.join(root, 'repository');
        const scripts = path.join(repository, 'apps/lace-sdk/scripts');
        fs.mkdirSync(scripts, { recursive: true });
        fs.mkdirSync(path.join(repository, '.github/workflows'), {
          recursive: true,
        });
        fs.copyFileSync(
          path.resolve(import.meta.dirname, '../scripts/releases.mjs'),
          path.join(scripts, 'releases.mjs'),
        );
        fs.writeFileSync(
          path.join(repository, '.github/workflows/sdk-release-version.yml'),
          workflow,
        );
        git(repository, 'init', '-q', '-b', 'main');
        git(repository, 'config', 'user.email', 'test@example.invalid');
        git(repository, 'config', 'user.name', 'test');
        git(repository, 'config', 'commit.gpgsign', 'false');
        git(repository, 'config', 'tag.gpgsign', 'false');
        const shas: Record<string, string> = {};
        for (const tag of releases) {
          git(repository, 'add', '-A');
          git(repository, 'commit', '-q', '--allow-empty', '-m', tag);
          git(repository, 'tag', tag);
          shas[tag] = git(repository, 'rev-parse', 'HEAD');
        }
        git(repository, 'commit', '-q', '--allow-empty', '-m', 'a change');
        const bin = path.join(root, 'bin');
        fs.mkdirSync(bin);
        fs.writeFileSync(
          path.join(bin, 'gh'),
          `#!/usr/bin/env bash\ncat <<'EOF'\n${releases
            .map((tagName, day) =>
              JSON.stringify({
                tagName,
                isDraft: false,
                isPrerelease: tagName.includes('-canary.'),
                publishedAt: `2026-10-0${day + 1}T02:00:00Z`,
              }),
            )
            .join('\n')}\nEOF\n`,
          { mode: 0o755 },
        );
        git(repository, 'checkout', '-q', shas[checkout] ?? checkout);
        const output = path.join(root, 'output');
        fs.writeFileSync(output, '');
        try {
          execFileSync('bash', ['-c', script], {
            cwd: repository,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
              ...process.env,
              PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}`,
              CHANNEL: 'canary',
              EXPECT: expect,
              PACKAGE: name,
              REQUIRE_MAIN: 'false',
              CREATE_RELEASE: 'false',
              GH_TOKEN: '',
              GITHUB_REPOSITORY: 'example/lace-platform',
              GITHUB_OUTPUT: output,
              RUNNER_TEMP: root,
            },
          });
          return { passed: true, output: fs.readFileSync(output, 'utf8') };
        } catch (error) {
          const { stdout = '', stderr = '' } = error as {
            stdout?: string;
            stderr?: string;
          };
          return { passed: false, output: stdout + stderr };
        }
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    };

    it("checks a dry run's release, which was never tagged, against every release", () => {
      const result = runStep({
        checkout: 'main',
        expect: '@laceio/sdk@0.1.1-canary.0',
        package: '@laceio/sdk',
        releases: ['lace-sdk@0.1.0', '@laceio/cardano@0.1.1'],
      });
      expect(result.passed, result.output).toBe(true);
      expect(result.output).toContain(
        'dependencies=@laceio/cardano@0.1.1 @laceio/cardano-ledger@0.1.0 @laceio/cardano-trezor@0.1.0',
      );
    });

    it("reads one package's own releases beside the family's", () => {
      const releases = [
        'lace-sdk@0.1.0',
        '@laceio/cardano@0.1.1',
        '@laceio/cardano@0.1.2-canary.0',
      ];
      const cardano = runStep({
        checkout: 'main',
        expect: '',
        package: '@laceio/cardano',
        releases,
      });
      expect(cardano.output).toContain('previous_tag=@laceio/cardano@0.1.1');
      expect(cardano.output).toContain(
        'scope_ref=@laceio/cardano@0.1.2-canary.0',
      );
      // What it depends on at that release, to find a range that moved.
      expect(cardano.output).toContain(
        'scope_dependencies=@laceio/cardano-ledger@0.1.0 @laceio/cardano-trezor@0.1.0 @laceio/sdk@0.1.0',
      );
      const sdk = runStep({
        checkout: 'main',
        expect: '',
        package: '@laceio/sdk',
        releases,
      });
      expect(sdk.output).toContain('previous_tag=lace-sdk@0.1.0');
      expect(sdk.output).toContain('first_canary=true');
      // A canary carries each other package at its latest release.
      expect(sdk.output).toContain(
        'dependencies=@laceio/cardano@0.1.2-canary.0 @laceio/cardano-ledger@0.1.0 @laceio/cardano-trezor@0.1.0',
      );
      // At its previous stable release, the family's, each was at 0.1.0.
      expect(sdk.output).toContain(
        'previous_dependencies=@laceio/cardano@0.1.0 @laceio/cardano-ledger@0.1.0 @laceio/cardano-trezor@0.1.0',
      );
    });

    it("passes a canary's own release event when it is the newest release", () => {
      const result = runStep({
        checkout: 'lace-sdk@0.2.0-canary.2',
        expect: 'lace-sdk@0.2.0-canary.2',
      });
      expect(result.output).toContain('previous_tag=lace-sdk@0.1.0');
      expect(result.passed).toBe(true);
    });

    it('refuses a re-run of an earlier canary once a newer release is tagged', () => {
      const result = runStep({
        checkout: 'lace-sdk@0.2.0-canary.1',
        expect: 'lace-sdk@0.2.0-canary.1',
      });
      expect(result.passed).toBe(false);
      expect(result.output).toContain(
        'does not contain lace-sdk@0.2.0-canary.2',
      );
      expect(result.output).toContain(
        'lace-sdk@0.2.0-canary.2 supersedes lace-sdk@0.2.0-canary.1',
      );
    });

    it('refuses a new canary from a commit before the newest release', () => {
      const result = runStep({
        checkout: 'lace-sdk@0.2.0-canary.1',
        expect: '',
      });

      expect(result.passed).toBe(false);
      expect(result.output).toContain(
        'does not contain lace-sdk@0.2.0-canary.2',
      );
    });

    const outputOf = (output: string, key: string) =>
      new RegExp(`^${key}=(.*)$`, 'm').exec(output)?.[1];

    it('counts a first canary from nothing, so it ships, with notes since the latest stable release', () => {
      const result = runStep({
        checkout: 'main',
        expect: '',
        releases: ['lace-sdk@0.1.0'],
      });
      expect(result.passed).toBe(true);
      expect(outputOf(result.output, 'scope_ref')).toBe('');
      expect(outputOf(result.output, 'first_canary')).toBe('true');
      expect(outputOf(result.output, 'notes_ref')).toBe('lace-sdk@0.1.0');
    });

    it('counts a canary from the latest canary, at its commit or after it', () => {
      for (const checkout of ['lace-sdk@0.2.0-canary.2', 'main']) {
        const result = runStep({ checkout, expect: '' });
        expect(result.passed).toBe(true);
        expect(outputOf(result.output, 'scope_ref')).toBe(
          'lace-sdk@0.2.0-canary.2',
        );
        expect(outputOf(result.output, 'notes_ref')).toBe(
          'lace-sdk@0.2.0-canary.2',
        );
        expect(outputOf(result.output, 'first_canary')).toBe('false');
      }
    });

    it('counts a canary from the latest canary when a stable release came since', () => {
      const result = runStep({
        checkout: 'main',
        expect: '',
        releases: [
          'lace-sdk@0.1.0',
          'lace-sdk@0.1.1-canary.0',
          'lace-sdk@0.1.1',
        ],
      });
      expect(result.passed).toBe(true);
      expect(outputOf(result.output, 'previous_tag')).toBe('lace-sdk@0.1.1');
      expect(outputOf(result.output, 'scope_ref')).toBe(
        'lace-sdk@0.1.1-canary.0',
      );
    });

    it("checks a canary's own release against the canary before it", () => {
      const result = runStep({
        checkout: 'lace-sdk@0.2.0-canary.2',
        expect: 'lace-sdk@0.2.0-canary.2',
      });
      expect(outputOf(result.output, 'scope_ref')).toBe(
        'lace-sdk@0.2.0-canary.1',
      );
    });
  },
);
