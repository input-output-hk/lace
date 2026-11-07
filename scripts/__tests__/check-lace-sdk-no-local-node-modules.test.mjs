import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const guard = fileURLToPath(
  new URL('../check-lace-sdk-no-local-node-modules.mjs', import.meta.url),
);
const runGuard = packages => {
  const root = mkdtempSync(join(tmpdir(), 'lace-sdk-install-'));
  try {
    mkdirSync(join(root, 'scripts'));
    copyFileSync(guard, join(root, 'scripts/check.mjs'));
    for (const [name, version] of packages) {
      const directory = join(root, 'apps/lace-sdk/node_modules', name);
      mkdirSync(directory, { recursive: true });
      if (version !== null) {
        writeFileSync(
          join(directory, 'package.json'),
          JSON.stringify({ name, version }),
        );
      }
    }
    return spawnSync(process.execPath, [join(root, 'scripts/check.mjs')], {
      encoding: 'utf8',
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

describe('SDK development dependency isolation', () => {
  it('accepts an entirely hoisted installation', () => {
    expect(runGuard([]).status).toBe(0);
  });

  it('accepts the pinned v1 development peers and their local dependencies', () => {
    const result = runGuard([
      ['@midnightntwrk/wallet-sdk', '1.2.0'],
      ['@midnightntwrk/wallet-sdk-abstractions', '2.1.0'],
      ['@midnightntwrk/wallet-sdk-address-format', '3.1.2'],
      ['@midnightntwrk/wallet-sdk-indexer-client', '1.2.3'],
      ['@midnightntwrk/wallet-sdk-utilities', '1.2.1'],
      ['@scure/base', '2.4.0'],
    ]);
    expect(result.status, result.stderr).toBe(0);
  });

  it.each([
    ['react', '19.2.3'],
    ['@lace-lib/core', '0.1.0'],
    ['@midnightntwrk/wallet-sdk', '2.0.0'],
    ['@scure/base', '2.5.0'],
    ['@midnightntwrk/wallet-sdk', null],
  ])(
    'rejects an unexpected or incomplete local %s package (%s)',
    (name, version) => {
      const result = runGuard([[name, version]]);
      expect(result.status).toBe(1);
      expect(result.error).toBeUndefined();
      expect(result.stderr).toContain(name);
    },
  );
});
