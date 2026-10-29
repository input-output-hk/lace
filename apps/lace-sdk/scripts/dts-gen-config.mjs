// Writes the tsconfig the declaration build compiles: the channel's entries
// (ADR 66) and every workspace file they reach, with the augmentations of
// exactly the packages they reach (reach.mjs). Reached files are listed because
// the compiler emits no declarations for workspace files it finds through
// node_modules symlinks. Compiling whole package directories instead would
// publish the state types of contracts the SDK never loads.
import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import {
  channelEntries,
  compilerOptions,
  moduleSuffixes,
  packageDirectory,
  reachedWorkspaceFiles,
  workspacePackages,
} from './reach.mjs';

const channel = process.env.SDK_CHANNEL ?? 'stable';
const roots = channelEntries(channel).filter(
  file =>
    !process.env.ENTRY ||
    path.basename(file).split('.')[0] === process.env.ENTRY,
);
if (roots.length === 0)
  throw new Error(`Unknown SDK entry: ${process.env.ENTRY}`);
const files = reachedWorkspaceFiles(roots, compilerOptions(channel));

// The standalone SDK drops optional private packages; even type imports must not reach them.
const workspaceRoot = path.resolve(packageDirectory, '../..');
const optional = new Set(
  workspacePackages(files, workspaceRoot).flatMap(directory =>
    Object.keys(
      JSON.parse(
        fs.readFileSync(
          path.join(workspaceRoot, directory, 'package.json'),
          'utf8',
        ),
      ).optionalDependencies ?? {},
    ),
  ),
);
const packageName = specifier =>
  specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/');
const restricted = files.flatMap(file =>
  ts
    .preProcessFile(fs.readFileSync(file, 'utf8'), true, true)
    .importedFiles.filter(({ fileName }) => optional.has(packageName(fileName)))
    .map(
      ({ fileName }) =>
        `${path.relative(workspaceRoot, file)} imports ${fileName}`,
    ),
);
if (restricted.length > 0) {
  throw new Error(
    `The ${channel} entries reach optional dependencies, which the standalone repository drops:\n  ${restricted.join(
      '\n  ',
    )}`,
  );
}

fs.writeFileSync(
  path.join(packageDirectory, 'tsconfig.dts-gen.generated.json'),
  JSON.stringify(
    {
      extends: './tsconfig.dts-gen.json',
      compilerOptions: { moduleSuffixes: moduleSuffixes(channel) },
      include: [],
      files: files.map(file => path.relative(packageDirectory, file)).sort(),
    },
    undefined,
    2,
  ) + '\n',
);
// eslint-disable-next-line no-console -- concise build proof
console.log(
  `[dts-gen-config] ${channel}: ${files.length} files, with the augmentations of the packages the entries reach`,
);
