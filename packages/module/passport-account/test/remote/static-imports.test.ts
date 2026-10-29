import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC_DIR = path.resolve(__dirname, '..', '..', 'src');
const REMOTE_DIR = path.join(SRC_DIR, 'remote');
const ACC_MODULE = path.join(SRC_DIR, 'acc', 'acc-module.ts');
const SDK_ENTRY = path.join(SRC_DIR, 'sdk.ts');
const GRANT_RULES = path.join(SRC_DIR, 'acc', 'grant-rules.ts');

/**
 * The dApp-side seams the SDK's Cardano entry bundles: these must reach no
 * Midnight code at all, dynamically included, since that entry is held to
 * carry no Passport or Midnight runtime.
 */
const DAPP_SEAMS = [
  'codec.ts',
  'remote-account-records.ts',
  'remote-authoriser.ts',
  'remote-encryption-key.ts',
  'request.ts',
];

/**
 * Static import, side-effect import and re-export specifiers, matched over
 * the whole source so a statement is found wherever its `from` clause
 * lands, however the formatter wrapped it. Type-only forms are erased at
 * build time, so they never count; dynamic `import()` is deferred and
 * counts only when `dynamic` is asked for.
 */
const STATIC_SPECIFIER_PATTERN =
  /(?:^|[\n;])[ \t]*(?:(?:import|export)\s+(?!type\b)[^;'"]*?\bfrom\s*|import\s*)['"]([^'"]+)['"]/g;

const DYNAMIC_SPECIFIER_PATTERN = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;

const MIDNIGHT_PACKAGE_PATTERN = /^@midnight(-)?ntwrk\//;

const specifiers = (code: string, dynamic: boolean): string[] => {
  const patterns = dynamic
    ? [STATIC_SPECIFIER_PATTERN, DYNAMIC_SPECIFIER_PATTERN]
    : [STATIC_SPECIFIER_PATTERN];
  return patterns.flatMap(pattern =>
    [...code.matchAll(pattern)].map(match => match[1]),
  );
};

/**
 * Walks the import closure of the given modules through the package's
 * own sources and collects every Midnight package it reaches and every
 * path that lands on the contract module.
 */
const importViolations = async (
  entries: string[],
  { dynamic }: { dynamic: boolean },
): Promise<string[]> => {
  const violations: string[] = [];
  const visited = new Set<string>();
  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (visited.has(file)) continue;
    visited.add(file);
    const code = await readFile(file, 'utf8');
    for (const specifier of specifiers(code, dynamic)) {
      if (MIDNIGHT_PACKAGE_PATTERN.test(specifier)) {
        violations.push(`${path.relative(SRC_DIR, file)}: ${specifier}`);
      } else if (specifier.startsWith('.')) {
        const resolved = `${path.resolve(path.dirname(file), specifier)}.ts`;
        if (resolved === ACC_MODULE) {
          violations.push(`${path.relative(SRC_DIR, file)}: ${specifier}`);
        } else {
          queue.push(resolved);
        }
      }
    }
  }
  return violations;
};

describe('remote modules import closure', () => {
  it('reaches neither the contract module nor a Midnight package statically, so the signer protocol stays out of the Midnight bundle', async () => {
    const entries = (await readdir(REMOTE_DIR))
      .filter(name => name.endsWith('.ts'))
      .map(name => path.join(REMOTE_DIR, name));

    expect(entries.length).toBeGreaterThan(0);
    await expect(
      importViolations(entries, { dynamic: false }),
    ).resolves.toEqual([]);
  });

  it('keeps the dApp-side seams free of Midnight code even through dynamic imports', async () => {
    const entries = DAPP_SEAMS.map(name => path.join(REMOTE_DIR, name));

    await expect(importViolations(entries, { dynamic: true })).resolves.toEqual(
      [],
    );
  });

  it('keeps the SDK entry off the contract module and Midnight packages statically, so the signer page and the SDK bundle it without the runtime', async () => {
    await expect(
      importViolations([SDK_ENTRY], { dynamic: false }),
    ).resolves.toEqual([]);
  });

  it('keeps the grant rules free of Midnight code even through dynamic imports, so a scope can be refused without the runtime', async () => {
    await expect(
      importViolations([GRANT_RULES], { dynamic: true }),
    ).resolves.toEqual([]);
  });

  it('would report the contract module if a remote module imported it', async () => {
    await expect(
      importViolations([path.join(SRC_DIR, 'acc', 'grants.ts')], {
        dynamic: false,
      }),
    ).resolves.toContain('acc/grants.ts: ./acc-module');
    await expect(
      importViolations([path.join(SRC_DIR, 'acc', 'signing-loader.ts')], {
        dynamic: true,
      }),
    ).resolves.toContain('acc/grants.ts: ./acc-module');
  });

  it('finds a specifier wherever its from clause lands', () => {
    const code = [
      "import { a } from './one';",
      'import {',
      '  D,',
      "} from '@midnight-ntwrk/compact-runtime';",
      "import type { T } from './type-only';",
      "import './side-effect';",
      'export {',
      '  x,',
      "} from './two';",
      "export type { Y } from './erased';",
      "const lazy = import('./lazy');",
    ].join('\n');

    expect(specifiers(code, false)).toEqual([
      './one',
      '@midnight-ntwrk/compact-runtime',
      './side-effect',
      './two',
    ]);
    expect(specifiers(code, true)).toEqual([
      './one',
      '@midnight-ntwrk/compact-runtime',
      './side-effect',
      './two',
      './lazy',
    ]);
  });
});
