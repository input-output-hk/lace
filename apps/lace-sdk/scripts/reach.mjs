// What the SDK reaches in the workspace: the source files the TypeScript
// compiler loads from a set of roots, closed over the augmentations of every
// package whose barrel it reaches. Module augmentations are side-effect declarations nothing
// imports, so they are added explicitly; an augmentation can reach further
// packages, so this repeats until the set stops growing. The declaration build
// (dts-gen-config.mjs) and the standalone repository's generator share it, so
// the two cannot disagree about what the SDK needs.
import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { channelEntryNames, entrySource } from './entries.mjs';

export const packageDirectory = path.resolve(import.meta.dirname, '..');

const PACKAGE_SOURCE =
  /[/\\]packages[/\\](contract|lib|module|next)[/\\]([^/\\]+)[/\\]src[/\\]/;

/**
 * The module suffixes a build channel resolves first (ADR 66). A workspace file
 * `x.stable.ts` replaces `x.ts` in the stable build: it is how a shared package
 * leaves a canary feature, or an app-only part, out of the stable SDK without
 * changing what the apps compile.
 */
export const moduleSuffixes = channel =>
  channel === 'stable' ? ['.stable', ''] : [''];

/**
 * Compiler options of the declaration build, with the workspace path aliases
 * and the channel's module suffixes.
 */
export const compilerOptions = (channel = 'canary') => {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    path.join(packageDirectory, 'tsconfig.dts-gen.json'),
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined },
  );
  if (!parsed) throw new Error('Cannot read tsconfig.dts-gen.json');
  return { ...parsed.options, moduleSuffixes: moduleSuffixes(channel) };
};

/** The entry files of a build channel (ADR 66). */
export const channelEntries = channel =>
  channelEntryNames(channel).map(entry =>
    path.join(packageDirectory, entrySource(entry, channel)),
  );

/**
 * The SDK's own source files a build channel reaches from its entries, as
 * real paths. reachedWorkspaceFiles collects the workspace packages' source
 * alone; the SDK's own counts whole (release-scope.ts), less what only the
 * other channel's build reaches.
 */
const ownSource = new Map();
export const reachedOwnSource = channel => {
  // One program per channel: the source does not change within a run.
  if (!ownSource.has(channel)) {
    const source = path.join(packageDirectory, 'src') + path.sep;
    ownSource.set(
      channel,
      new Set(
        ts
          .createProgram(channelEntries(channel), compilerOptions(channel))
          .getSourceFiles()
          .map(file => fs.realpathSync(file.fileName))
          .filter(file => file.startsWith(source)),
      ),
    );
  }
  return ownSource.get(channel);
};

/**
 * The workspace source files reached from `roots`, plus the augmentations of
 * the packages reached, as real paths. Files under node_modules are excluded:
 * the compiler reaches workspace packages through their node_modules symlinks
 * and emits nothing for files it finds there, so callers list real paths.
 */
export const reachedWorkspaceFiles = (roots, options = compilerOptions()) => {
  const files = new Set(roots.map(root => fs.realpathSync(root)));
  for (;;) {
    const program = ts.createProgram([...files], options);
    const before = files.size;
    for (const source of program.getSourceFiles()) {
      const match = PACKAGE_SOURCE.exec(source.fileName);
      if (!match) continue;
      if (
        /\.[cm]?tsx?$/.test(source.fileName) &&
        !source.fileName.endsWith('.d.ts')
      ) {
        files.add(fs.realpathSync(source.fileName));
      }
      // A package's augmentations describe its contract, which its barrel
      // loads: a package reached only through a deep import or another entry,
      // such as a module's sdk.ts, contributes the ones that entry imports.
      if (!/[/\\]src[/\\]index(?:\.stable)?\.tsx?$/.test(source.fileName)) {
        continue;
      }
      const augmentations = (options.moduleSuffixes ?? [''])
        .map(suffix =>
          path.join(
            source.fileName.slice(0, match.index),
            'packages',
            match[1],
            match[2],
            'src',
            `augmentations${suffix}.ts`,
          ),
        )
        .find(file => fs.existsSync(file));
      if (augmentations) files.add(augmentations);
    }
    if (files.size === before) return [...files].sort();
  }
};

/** The workspace package directories (e.g. packages/lib/core) of `files`. */
export const workspacePackages = (files, root) =>
  [
    ...new Set(
      files.flatMap(file => {
        const match = PACKAGE_SOURCE.exec(file);
        return match ? [`packages/${match[1]}/${match[2]}`] : [];
      }),
    ),
  ]
    .filter(directory => fs.existsSync(path.join(root, directory)))
    .sort();

/** The Cardano packages, published from the same repository (ADR 68). */
export const CARDANO_APPS = [
  'apps/lace-cardano',
  'apps/lace-cardano-ledger',
  'apps/lace-cardano-trezor',
];

/**
 * The workspace sources each Cardano package's build inlines, beside its own
 * (its tsdown.config.ts): the domain layer inlines the ported packages it
 * publishes; a hardware wallet package inlines its adapter alone and imports
 * the domain layer from `@laceio/cardano`, so the rest of what its sources
 * reach is not in its output.
 */
const CARDANO_INLINED = {
  'apps/lace-cardano': () => true,
  'apps/lace-cardano-ledger': file =>
    /[/\\]packages[/\\]lib[/\\]cardano-hardware-ledger[/\\]/.test(file),
  'apps/lace-cardano-trezor': file =>
    /[/\\]packages[/\\]lib[/\\]cardano-hardware-trezor[/\\]/.test(file),
};

/**
 * The workspace source the Cardano packages' builds reach, or those of
 * `apps` alone, resolved with the declaration build's configuration: each
 * app's own sources and the workspace sources its build inlines
 * (CARDANO_INLINED), as real paths.
 */
export const cardanoReachedFiles = (apps = CARDANO_APPS) => {
  const repositoryRoot = path.resolve(packageDirectory, '../..');
  const parsed = ts.getParsedCommandLineOfConfigFile(
    path.join(repositoryRoot, CARDANO_APPS[0], 'tsconfig.dts.json'),
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined },
  );
  if (!parsed) throw new Error('Cannot read the Cardano tsconfig.dts.json');
  const reached = new Set();
  for (const app of apps) {
    const own = path.join(repositoryRoot, app) + path.sep;
    const roots = fs
      .readdirSync(path.join(repositoryRoot, app, 'src'), { recursive: true })
      .filter(file => /\.tsx?$/.test(file))
      .map(file => path.join(repositoryRoot, app, 'src', file));
    const inlined = CARDANO_INLINED[app] ?? (() => true);
    for (const file of reachedWorkspaceFiles(roots, parsed.options)) {
      if (file.startsWith(own) || inlined(file)) reached.add(file);
    }
  }
  return [...reached].sort();
};
