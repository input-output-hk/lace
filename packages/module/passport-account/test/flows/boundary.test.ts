import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

import type { Linter } from 'eslint';

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const WORKSPACE_ROOT = path.resolve(PACKAGE_ROOT, '..', '..', '..');
const FLOWS_DIR = path.join(PACKAGE_ROOT, 'src/flows');
const FLOW_PROBE_PATH = path.join(FLOWS_DIR, '__boundary-probe.ts');

/** Every flow file as written, grants included, each held to the rule. */
const flowFiles = (await readdir(FLOWS_DIR))
  .filter(name => name.endsWith('.ts'))
  .sort();

type FlatConfigEntry = {
  files?: string[];
  rules?: Record<string, unknown>;
};

/**
 * The live `no-restricted-imports` options the package config applies to
 * `src/flows`, read from the config file itself so the probes below exercise
 * whatever the rule currently says rather than a copy of it.
 */
const flowRuleOptions = (async (): Promise<unknown> => {
  const { default: config } = (await import(
    path.join(PACKAGE_ROOT, 'eslint.config.mjs')
  )) as { default: FlatConfigEntry[] };
  const flowEntry = config.find(
    entry =>
      entry.files?.includes('src/flows/**/*.ts') &&
      entry.rules?.['no-restricted-imports'] !== undefined,
  );
  if (!flowEntry) {
    throw new Error(
      'passport flow boundary probe: no src/flows no-restricted-imports entry in packages/module/passport-account/eslint.config.mjs',
    );
  }
  return flowEntry.rules!['no-restricted-imports'];
})();

/**
 * Lints `code` as if it were a flow file, without writing it to disk. The
 * rule needs no type information, so a bare parser sidesteps the tsconfig
 * membership check a virtual path would fail.
 */
const lintAsFlow = async (
  code: string,
  filePath = FLOW_PROBE_PATH,
): Promise<string[]> => {
  const eslint = new ESLint({
    cwd: WORKSPACE_ROOT,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.ts'],
        languageOptions: { parser: tseslint.parser },
        rules: {
          'no-restricted-imports': (await flowRuleOptions) as Linter.RuleEntry,
        },
      },
    ],
  });
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map(message => message.ruleId ?? '<parse-error>');
};

describe('passport flow-layer boundary', () => {
  it('covers every flow file, the grant flows included', () => {
    expect(flowFiles).toEqual(
      expect.arrayContaining([
        'create-account.ts',
        'devices.ts',
        'grants.ts',
        'holdings.ts',
        'sign-in.ts',
      ]),
    );
  });

  it.each(flowFiles)('accepts src/flows/%s as written', async name => {
    const filePath = path.join(FLOWS_DIR, name);
    await expect(
      lintAsFlow(await readFile(filePath, 'utf8'), filePath),
    ).resolves.toEqual([]);
  });

  it('accepts the value objects, errors and types a flow legitimately takes from the contract barrel', async () => {
    const code = [
      "import { AccAddress, LastDeviceError } from '@lace-contract/passport';",
      "import type { PassportDevice } from '@lace-contract/passport';",
      'export const probe = (device: PassportDevice) =>',
      '  AccAddress(device.commitmentHex) && LastDeviceError;',
      '',
    ].join('\n');
    await expect(lintAsFlow(code)).resolves.toEqual([]);
  });

  it.each(['passportActions', 'passportSelectors', 'passportStoreContract'])(
    'rejects %s imported through the contract barrel',
    async name => {
      const code = `import { ${name} } from '@lace-contract/passport';\nexport const probe = ${name};\n`;
      await expect(lintAsFlow(code)).resolves.toEqual([
        'no-restricted-imports',
      ]);
    },
  );

  it.each([
    '@lace-contract/passport/src/store',
    '@lace-contract/passport/src/store/slice',
    '../store',
    '../store/account-record',
  ])('rejects the store layer reached at %s', async specifier => {
    const code = `import { passportActions } from '${specifier}';\nexport const probe = passportActions;\n`;
    await expect(lintAsFlow(code)).resolves.toEqual(['no-restricted-imports']);
  });

  it.each([
    'rxjs',
    '@reduxjs/toolkit',
    'redux-observable',
    '@lace-contract/module',
  ])('rejects the framework import %s', async specifier => {
    const code = `import * as banned from '${specifier}';\nexport const probe = banned;\n`;
    await expect(lintAsFlow(code)).resolves.toEqual(['no-restricted-imports']);
  });
});
