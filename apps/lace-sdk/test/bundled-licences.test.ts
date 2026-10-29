import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  inlinedPackageDirectories,
  isPermissive,
  licenceViolations,
} from './bundled-licences.mjs';

describe('bundled-licences', () => {
  it('reads SPDX expressions strictly, with their grouping', () => {
    expect(isPermissive('MIT')).toBe(true);
    expect(isPermissive('Apache-2.0 WITH LLVM-exception')).toBe(true);
    expect(isPermissive('MIT OR GPL-3.0-or-later')).toBe(true);
    expect(isPermissive('(MIT OR Apache-2.0) AND BSD-3-Clause')).toBe(true);
    expect(isPermissive('GPL-3.0-or-later')).toBe(false);
    expect(isPermissive('GPL-3.0+')).toBe(false);
    // Grouping matters: an AND with a copyleft term is copyleft whatever the OR says.
    expect(isPermissive('(MIT OR Apache-2.0) AND GPL-3.0-or-later')).toBe(
      false,
    );
    expect(isPermissive('MIT AND (Apache-2.0 OR GPL-3.0-or-later)')).toBe(true);
    // Not an expression: refused, never guessed.
    expect(isPermissive('SEE LICENSE IN LICENSE')).toBe(false);
    expect(isPermissive('MIT OR')).toBe(false);
    expect(isPermissive('(MIT')).toBe(false);
    expect(isPermissive('')).toBe(false);
    expect(isPermissive(undefined)).toBe(false);
    // A character outside the grammar is not skipped over.
    expect(isPermissive('[MIT]')).toBe(false);
    expect(isPermissive('MIT /')).toBe(false);
    expect(isPermissive('MIT, ISC')).toBe(false);
    expect(isPermissive('MIT AND (ISC)+')).toBe(false);
    // Only a listed exception may follow WITH, and only after a bare licence.
    expect(isPermissive('MIT WITH AND')).toBe(false);
    expect(isPermissive('MIT WITH')).toBe(false);
    expect(isPermissive('MIT WITH GPL-3.0-only')).toBe(false);
    expect(isPermissive('MIT WITH made-up-exception')).toBe(false);
    expect(isPermissive('(MIT) WITH LLVM-exception')).toBe(false);
    expect(isPermissive('MIT WITH LLVM-exception WITH LLVM-exception')).toBe(
      false,
    );
    expect(isPermissive('GPL-2.0-only WITH Classpath-exception-2.0')).toBe(
      false,
    );
    expect(isPermissive('MIT+')).toBe(true);
    expect(isPermissive(' MIT ')).toBe(true);
    // An identifier the guard does not know refuses the expression wherever
    // it stands, so a misspelling is never read as a licence.
    expect(isPermissive('MIT OR made-up-license')).toBe(false);
    expect(isPermissive('MIT OR GPL-3.0-on1y')).toBe(false);
    expect(isPermissive('MIT OR LLVM-exception')).toBe(false);
    expect(isPermissive('M1T')).toBe(false);
    expect(isPermissive('(MIT AND BSD-3-Clause)')).toBe(true);
    // The deprecated spellings packages still declare are known.
    expect(isPermissive('MIT OR GPL-2.0')).toBe(true);
    expect(isPermissive('GPL-2.0 OR MIT')).toBe(true);
    expect(isPermissive('GPL-2.0')).toBe(false);
    expect(isPermissive('LGPL-2.1+')).toBe(false);
  });

  it('names every inlined package, including those under a workspace package', () => {
    const code = [
      '//#region ../../node_modules/@subsquid/scale-codec/lib/index.js',
      '//#region ../../node_modules/@subsquid/scale-codec/lib/codec.js',
      '//#region ../../packages/lib/crypto/node_modules/@scure/bip39/index.js',
      '//#region ../../packages/module/blockchain-bitcoin/node_modules/bip39/src/index.js',
      '//#region ../../packages/lib/util/src/index.ts',
      // A file name with a space: the marker runs to the end of the line.
      '//#region ../../node_modules/spaced/file name.js',
      '//#region ../../node_modules/@scope/spaced name/index.js\r',
      'const x = 1;',
    ].join('\n');
    expect([...inlinedPackageDirectories(code)]).toEqual([
      ['../../node_modules/@subsquid/scale-codec', '@subsquid/scale-codec'],
      ['../../packages/lib/crypto/node_modules/@scure/bip39', '@scure/bip39'],
      ['../../packages/module/blockchain-bitcoin/node_modules/bip39', 'bip39'],
      ['../../node_modules/spaced', 'spaced'],
      ['../../node_modules/@scope/spaced name', '@scope/spaced name'],
    ]);
  });

  it('judges each installed copy by its own manifest and refuses a missing field', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lace-sdk-licences-'));
    try {
      const write = (relative: string, content: string) => {
        const target = path.join(root, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
      };
      const distribution = path.join(root, 'dist');
      write(
        'dist/index.js',
        [
          '//#region ../node_modules/lib-a/index.js',
          '//#region ../packages/x/node_modules/lib-a/index.js',
          '//#region ../node_modules/no-field/index.js',
          '//#region ../node_modules/@scope/ok/index.js',
        ].join('\n'),
      );
      write(
        'node_modules/lib-a/package.json',
        JSON.stringify({ version: '1.0.0', license: 'MIT' }),
      );
      // The same name installed again under a workspace package, copyleft.
      write(
        'packages/x/node_modules/lib-a/package.json',
        JSON.stringify({ version: '2.0.0', license: 'GPL-3.0-or-later' }),
      );
      write(
        'node_modules/no-field/package.json',
        JSON.stringify({ version: '3' }),
      );
      write(
        'node_modules/@scope/ok/package.json',
        JSON.stringify({ version: '4', license: { type: 'ISC' } }),
      );
      const { count, violations } = licenceViolations(
        distribution,
        distribution,
      );
      expect(count).toBe(4);
      expect(violations).toEqual([
        'lib-a@2.0.0: GPL-3.0-or-later (in index.js)',
        'no-field@3: no license field (in index.js)',
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
