import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import ts from 'typescript';
import { expect, it } from 'vitest';

import { reachedWorkspaceFiles } from '../scripts/reach.mjs';

it('closes over recursively reached barrel augmentations and respects the channel suffix', () => {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-reach-')),
  );
  const file = (name: string) => path.join(root, 'packages/lib', name);
  const sources = {
    'first/src/index.ts': 'export type First = string;',
    'first/src/augmentations.ts': "import '../../second/src';",
    'first/src/augmentations.stable.ts': "import '../../stable-only/src';",
    'second/src/index.ts': 'export type Second = number;',
    'second/src/augmentations.ts': "import '../../third/src/value';",
    'third/src/value.ts': 'export type Third = boolean;',
    'third/src/augmentations.ts': "import '../../not-reached/src';",
    'not-reached/src/index.ts': 'export type Unused = string;',
    'stable-only/src/index.ts': 'export type StableOnly = string;',
  };
  try {
    for (const [name, source] of Object.entries(sources)) {
      fs.mkdirSync(path.dirname(file(name)), { recursive: true });
      fs.writeFileSync(file(name), source);
    }
    const options: ts.CompilerOptions = {
      noLib: true,
      types: [],
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    };
    const reach = (moduleSuffixes: string[]) =>
      reachedWorkspaceFiles([file('first/src/index.ts')], {
        ...options,
        moduleSuffixes,
      }).map(source =>
        path
          .relative(path.join(root, 'packages/lib'), source)
          .split(path.sep)
          .join('/'),
      );
    expect(reach([''])).toEqual([
      'first/src/augmentations.ts',
      'first/src/index.ts',
      'second/src/augmentations.ts',
      'second/src/index.ts',
      'third/src/value.ts',
    ]);
    expect(reach(['.stable', ''])).toEqual([
      'first/src/augmentations.stable.ts',
      'first/src/index.ts',
      'stable-only/src/index.ts',
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
