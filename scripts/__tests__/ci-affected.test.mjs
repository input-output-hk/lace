import { describe, expect, it } from 'vitest';

import { installInputs, isAffected } from '../ci-affected.mjs';

const infra = [
  '.github/workflows/ci.yml',
  '.github/workflows/e2e-tests-lace.yml',
  '.github/actions/install/**',
  'package.json',
];

describe('ci-affected', () => {
  it('is affected when one of its projects is', () => {
    expect(
      isAffected({
        affectedProjects: ['@lace-lib/util', 'lace-extension'],
        changedFiles: ['packages/lib/util/src/index.ts'],
        projects: ['lace-extension', 'lace-extension-e2e'],
        infra,
      }),
    ).toBe(true);
  });

  it('is affected when a file that runs the suite changes, outside every project', () => {
    for (const file of [
      '.github/workflows/e2e-tests-lace.yml',
      '.github/actions/install/action.yml',
      'package.json',
    ]) {
      expect(
        isAffected({
          affectedProjects: [],
          changedFiles: [file],
          projects: ['lace-extension'],
          infra,
        }),
      ).toBe(true);
    }
  });

  it('is not affected by a change to another project or another workflow', () => {
    expect(
      isAffected({
        affectedProjects: ['lace-sdk-site'],
        changedFiles: [
          'apps/lace-sdk-site/scripts/sdk-versions.mjs',
          '.github/workflows/sdk-site-check.yml',
          'apps/lace-mobile/package.json',
        ],
        projects: ['lace-extension', 'lace-extension-e2e'],
        infra,
      }),
    ).toBe(false);
  });

  it('counts what every suite installs from, the postinstall scripts among it', () => {
    const manifest = {
      scripts: {
        postinstall:
          'node scripts/fix-wallet-sdk-abstractions.js && node scripts/check.mjs',
      },
    };
    for (const file of [
      '.nvmrc',
      '.npmrc',
      'package-lock.json',
      'scripts/ci-affected.mjs',
      'scripts/fix-wallet-sdk-abstractions.js',
      'scripts/check.mjs',
    ]) {
      expect(
        isAffected({
          affectedProjects: [],
          changedFiles: [file],
          projects: ['lace-mobile-storybook'],
          infra: installInputs(manifest),
        }),
      ).toBe(true);
    }
    expect(
      isAffected({
        affectedProjects: [],
        changedFiles: ['scripts/fix-webview-document-start.js'],
        projects: ['lace-mobile-storybook'],
        infra: installInputs(manifest),
      }),
    ).toBe(false);
  });
});
