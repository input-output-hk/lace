import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { docCommentProblems, readExportDocs } from '../scripts/doc-comments';

import type { ExportDoc } from '../scripts/doc-comments';

const OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2022,
  noEmit: true,
  types: [],
};

/** Writes `files` under a fresh directory whose `workspace/` is the workspace root. */
const fixture = (files: Record<string, string>) => {
  const directory = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'doc-comments-')),
  );
  for (const [name, source] of Object.entries(files)) {
    const file = path.join(directory, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, source);
  }
  const workspaceRoot = path.join(directory, 'workspace');
  return (...entries: string[]) =>
    readExportDocs({
      entries: entries.map(entry => path.join(workspaceRoot, entry)),
      options: OPTIONS,
      workspaceRoot,
    });
};

const statuses = (docs: ExportDoc[]) =>
  Object.fromEntries(docs.map(({ name, status }) => [name, status]));

describe('readExportDocs', () => {
  it('reads the doc comment on the declaration a re-export resolves to', () => {
    const read = fixture({
      'workspace/lib/types.ts': `
/** A documented type alias. */
export type Documented = string;
export type Undocumented = number;
/** A documented interface. */
export interface Shape { size: number }
/** A documented function. */
export const run = () => 1;
export class Bare {}
`,
      'workspace/lib/index.ts': `export * from './types';`,
      'workspace/sdk/index.ts': `
/** A comment on the re-export is not the declaration's. */
export { Bare as Renamed } from '../lib';
export { Documented, Undocumented, run } from '../lib';
export type { Shape } from '../lib';
`,
    });

    expect(statuses(read('sdk/index.ts'))).toEqual({
      Documented: 'documented',
      Renamed: 'undocumented',
      Shape: 'documented',
      Undocumented: 'undocumented',
      run: 'documented',
    });
  });

  it('lists a namespace export by its members', () => {
    const read = fixture({
      'workspace/sdk/modules.ts': `
/** A documented module factory. */
export const cardano = () => 1;
export const bitcoin = () => 2;
`,
      'workspace/sdk/index.ts': `export * as m from './modules';`,
    });

    expect(statuses(read('sdk/index.ts'))).toEqual({
      'm.bitcoin': 'undocumented',
      'm.cardano': 'documented',
    });
  });

  it('exempts declarations outside the workspace and in node_modules', () => {
    const read = fixture({
      'vendor/index.ts': `export const outside = 1;`,
      'workspace/node_modules/third-party/package.json': `{ "name": "third-party", "types": "index.d.ts" }`,
      'workspace/node_modules/third-party/index.d.ts': `export declare const installed: number;`,
      'workspace/sdk/index.ts': `
export { outside } from '../../vendor';
export { installed } from 'third-party';
`,
    });

    expect(read('sdk/index.ts')).toEqual([
      { entry: 'sdk/index.ts', name: 'outside', status: 'third-party' },
      { entry: 'sdk/index.ts', name: 'installed', status: 'third-party' },
    ]);
  });

  it('requires a doc comment on each half of a type and value sharing a name', () => {
    const read = fixture({
      'workspace/sdk/index.ts': `
/** A documented type. */
export type Both = string;
/** A documented constant. */
export const Both = (value: string) => value as Both;
/** Only the type is documented. */
export type TypeOnly = string;
export const TypeOnly = (value: string) => value as TypeOnly;
export type ValueOnly = string;
/** Only the constant is documented. */
export const ValueOnly = (value: string) => value as ValueOnly;
`,
    });

    expect(read('sdk/index.ts')).toEqual([
      {
        entry: 'sdk/index.ts',
        name: 'Both',
        status: 'documented',
        location: 'sdk/index.ts:3',
      },
      {
        entry: 'sdk/index.ts',
        name: 'TypeOnly',
        status: 'undocumented',
        location: 'sdk/index.ts:8',
      },
      {
        entry: 'sdk/index.ts',
        name: 'ValueOnly',
        status: 'undocumented',
        location: 'sdk/index.ts:9',
      },
    ]);
  });

  it('does not count a property assigned to a documented constant as a declaration of it', () => {
    const read = fixture({
      'workspace/sdk/index.ts': `
/** A documented type. */
export type Hex = string;
/** A documented constant. */
export const Hex = (value: string) => value as Hex;
Hex.fromBytes = (bytes: Uint8Array) => Hex(String(bytes));
`,
    });

    expect(statuses(read('sdk/index.ts'))).toEqual({ Hex: 'documented' });
  });

  it('requires a doc comment on each overload signature, not on the implementation', () => {
    const read = fixture({
      'workspace/sdk/index.ts': `
/** Parses a string. */
export function parse(value: string): number;
export function parse(value: number): number;
export function parse(value: string | number): number {
  return Number(value);
}
/** Formats a number. */
export function format(value: number): string;
/** Formats a bigint. */
export function format(value: bigint): string;
export function format(value: number | bigint): string {
  return String(value);
}
`,
    });

    expect(read('sdk/index.ts')).toEqual([
      {
        entry: 'sdk/index.ts',
        name: 'parse',
        status: 'undocumented',
        location: 'sdk/index.ts:4',
      },
      {
        entry: 'sdk/index.ts',
        name: 'format',
        status: 'documented',
        location: 'sdk/index.ts:9',
      },
    ]);
  });

  it('needs one doc comment across merged interface declarations', () => {
    const read = fixture({
      'workspace/sdk/index.ts': `
/** A documented interface. */
export interface Merged { a: number }
export interface Merged { b: number }
`,
    });

    expect(statuses(read('sdk/index.ts'))).toEqual({ Merged: 'documented' });
  });

  it('marks an export that resolves to no declaration as unresolved', () => {
    const read = fixture({
      'workspace/sdk/index.ts': `
export { missing } from './nowhere';
`,
    });

    expect(read('sdk/index.ts')).toEqual([
      {
        entry: 'sdk/index.ts',
        name: 'missing',
        status: 'unresolved',
        location: 'sdk/index.ts:2',
      },
    ]);
  });

  it('locates an undocumented declaration by workspace file and line', () => {
    const read = fixture({
      'workspace/sdk/index.ts': `\n\nexport const bare = 1;\n`,
    });

    expect(read('sdk/index.ts')).toEqual([
      {
        entry: 'sdk/index.ts',
        name: 'bare',
        status: 'undocumented',
        location: 'sdk/index.ts:3',
      },
    ]);
  });
});

const doc = (
  name: string,
  status: ExportDoc['status'],
  entry = 'sdk/index.canary.ts',
): ExportDoc => ({
  entry,
  name,
  status,
  ...(status === 'third-party' ? {} : { location: `lib/${name}.ts:1` }),
});

describe('docCommentProblems', () => {
  const NONE = new Set<string>();

  it('passes documented, third-party and baselined undocumented exports', () => {
    expect(
      docCommentProblems({
        exports: [
          doc('documented', 'documented'),
          doc('Cardano', 'third-party'),
          doc('pending', 'undocumented'),
        ],
        stableNames: new Set(['documented', 'Cardano']),
        baseline: ['pending'],
        isComplete: true,
      }),
    ).toEqual([]);
  });

  it('names the export, its entry and the declaration to document when it is not on the baseline', () => {
    expect(
      docCommentProblems({
        exports: [doc('added', 'undocumented')],
        stableNames: NONE,
        baseline: [],
        isComplete: true,
      }),
    ).toEqual([
      'added (sdk/index.canary.ts) has no doc comment: document its declaration at lib/added.ts:1',
    ]);
  });

  it('fails an unresolved export, even on the baseline', () => {
    expect(
      docCommentProblems({
        exports: [
          {
            entry: 'sdk/index.ts',
            name: 'missing',
            status: 'unresolved',
            location: 'sdk/index.ts:2',
          },
        ],
        stableNames: NONE,
        baseline: ['missing'],
        isComplete: true,
      }),
    ).toEqual([
      'missing (sdk/index.ts) does not resolve to a declaration (exported at sdk/index.ts:2): fix the export or the module it re-exports from',
    ]);
  });

  it('reports each undocumented declaration of an export', () => {
    expect(
      docCommentProblems({
        exports: [
          {
            ...doc('Pair', 'undocumented', 'sdk/index.ts'),
            location: 'lib/pair.ts:1',
          },
          {
            ...doc('Pair', 'undocumented', 'sdk/index.ts'),
            location: 'lib/pair.ts:2',
          },
        ],
        stableNames: new Set(['Pair']),
        baseline: [],
        isComplete: true,
      }),
    ).toHaveLength(2);
  });

  it('fails a baseline entry that is now documented', () => {
    expect(
      docCommentProblems({
        exports: [doc('fixed', 'documented')],
        stableNames: NONE,
        baseline: ['fixed'],
        isComplete: true,
      }),
    ).toEqual([
      'fixed is on the baseline but needs no entry (documented): remove it from the baseline',
    ]);
  });

  it('fails a baseline entry that is no longer exported, once the exports are complete', () => {
    const props = {
      exports: [],
      stableNames: NONE,
      baseline: ['removed'],
    };

    expect(docCommentProblems({ ...props, isComplete: true })).toEqual([
      'removed is on the baseline but is no longer exported: remove it from the baseline',
    ]);
    expect(docCommentProblems({ ...props, isComplete: false })).toEqual([]);
  });

  it('fails an undocumented stable export, baselined or not', () => {
    expect(
      docCommentProblems({
        exports: [
          doc('graduated', 'undocumented', 'sdk/index.ts'),
          doc('listed', 'undocumented', 'sdk/index.ts'),
        ],
        stableNames: new Set(['graduated', 'listed']),
        baseline: ['listed'],
        isComplete: false,
      }),
    ).toEqual([
      'graduated (sdk/index.ts) is a stable export without a doc comment: document its declaration at lib/graduated.ts:1; stable exports must be documented',
      'listed (sdk/index.ts) is a stable export without a doc comment: document its declaration at lib/listed.ts:1; stable exports must be documented',
      'listed is on the baseline but is a stable export, which must be documented: remove it from the baseline',
    ]);
  });

  it('reports a declaration once when several entries export it', () => {
    expect(
      docCommentProblems({
        exports: [
          doc('shared', 'undocumented', 'sdk/index.canary.ts'),
          doc('shared', 'undocumented', 'sdk/cardano.canary.ts'),
        ],
        stableNames: NONE,
        baseline: [],
        isComplete: true,
      }),
    ).toHaveLength(1);
  });
});
