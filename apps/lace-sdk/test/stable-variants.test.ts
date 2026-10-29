import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import {
  readStableOmissions,
  workspaceStableVariantProblems,
} from '../scripts/stable-variants';

/** Writes `files` under a fresh workspace directory and returns its path. */
const workspace = (files: Record<string, string>) => {
  const directory = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'stable-variants-')),
  );
  for (const [name, source] of Object.entries(files)) {
    const file = path.join(directory, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, source);
  }
  return directory;
};

// Export names need no standard library, and leaving it out keeps each
// fixture's compilation quick.
const fixtureOptions: ts.CompilerOptions = {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  noLib: true,
  types: [],
};

/** The parity problems of a one-variant fixture workspace. */
const problemsOf = (original: string, variant: string) =>
  workspaceStableVariantProblems({
    workspaceRoot: workspace({
      'packages/lib/demo/src/part.ts': original,
      'packages/lib/demo/src/part.stable.ts': variant,
    }),
    canaryOptions: fixtureOptions,
    stableOptions: { ...fixtureOptions, moduleSuffixes: ['.stable', ''] },
  });

const ORIGINAL = `
export const feature = () => 1;
export const shared = 2;
export type Shape = { name: string };
`;

describe('stable variant parity', () => {
  it('passes a variant that exports what its original does', () => {
    expect(
      problemsOf(
        ORIGINAL,
        `
export const feature = () => 0;
export const shared = 2;
export type Shape = { name: string };
`,
      ),
    ).toEqual([]);
  });

  it('fails a variant that lacks an export it does not declare omitted', () => {
    expect(
      problemsOf(
        ORIGINAL,
        `
export const shared = 2;
export type Shape = { name: string };
`,
      ),
    ).toEqual([
      "packages/lib/demo/src/part.stable.ts: lacks the value 'feature' its original exports; export it or declare it in a stable-omits line",
    ]);
  });

  it('passes the exports a variant declares omitted', () => {
    expect(
      problemsOf(
        ORIGINAL,
        `// The stable build leaves the feature out.
// stable-omits: feature,
// stable-omits: Shape
export const shared = 2;
`,
      ),
    ).toEqual([]);
  });

  it('fails a declared omission the original does not export', () => {
    expect(
      problemsOf(
        ORIGINAL,
        `// stable-omits: feature, removed
export const shared = 2;
export type Shape = { name: string };
`,
      ),
    ).toEqual([
      "packages/lib/demo/src/part.stable.ts: declares 'removed' omitted, but its original does not export it",
    ]);
  });

  it('fails a declared omission the variant exports', () => {
    expect(
      problemsOf(
        ORIGINAL,
        `// stable-omits: shared
export const feature = () => 0;
export const shared = 2;
export type Shape = { name: string };
`,
      ),
    ).toEqual([
      "packages/lib/demo/src/part.stable.ts: declares 'shared' omitted, but exports it",
    ]);
  });

  it('fails an export the original lacks, and a value exported as a type', () => {
    expect(
      problemsOf(
        ORIGINAL,
        `
export const feature = () => 0;
export type shared = number;
export type Shape = { name: string };
export const extra = 3;
`,
      ),
    ).toEqual([
      "packages/lib/demo/src/part.stable.ts: exports 'shared' as a type, its original as a value",
      "packages/lib/demo/src/part.stable.ts: exports 'extra', which its original does not",
    ]);
  });

  it('fails a variant whose original does not exist', () => {
    expect(
      workspaceStableVariantProblems({
        workspaceRoot: workspace({
          'packages/lib/demo/src/gone.stable.ts': 'export {};\n',
        }),
        canaryOptions: fixtureOptions,
        stableOptions: fixtureOptions,
      }),
    ).toEqual([
      'packages/lib/demo/src/gone.stable.ts: replaces packages/lib/demo/src/gone.ts, which does not exist',
    ]);
  });

  it('reads the names of every stable-omits line', () => {
    expect(
      readStableOmissions(
        '// Header.\n// stable-omits: b, a\n//stable-omits:c\nexport {};\n',
      ),
    ).toEqual(['a', 'b', 'c']);
  });
});
