import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { releaseSdkExclusions } from '../ci-release-sdk-exclusions.mjs';

const release = { eventName: 'pull_request', baseRef: 'release/2.5.x' };
const exclusions = ['lace-sdk', 'lace-sdk-example-passport', 'lace-sdk-site'];
const addressMovementFiles = [
  'packages/module/dapp-connector-cardano/src/common/components/sign-tx/AddressesSection.tsx',
  'packages/module/dapp-connector-cardano/src/common/hooks/useDappTxInspection.ts',
  'packages/module/dapp-connector-cardano/test/fixtures/lw15790-redemption.json',
  'packages/module/dapp-connector-cardano/test/sign-tx-address-movements.test.ts',
  'packages/module/dapp-connector-cardano/test/useDappTxInspection.test.ts',
];
const cli = fileURLToPath(
  new URL('../ci-release-sdk-exclusions.mjs', import.meta.url),
);

describe('temporary app-release SDK exception', () => {
  it.each([
    ...addressMovementFiles,
    'apps/lace-mobile/app.json',
    'apps/lace-next/app.json',
    'apps/lace-extension/assets/manifest.json',
    'packages/module/posthog-client-react-native/src/store/dependencies.ts',
    'packages/contract/feature/src/store/side-effects.ts',
    'packages/contract/network/src/network-restrictions.ts',
    'packages/next/core/src/domain/featureFlags.ts',
    'packages/next/core/src/store/slices/featureSlice.ts',
    'packages/next/ui/src/screens/Buy/BuySheet.tsx',
    'packages/lib/util-dev-storybook/src/stubs/midnight-wallet.ts',
    'apps/lace-sdk/.changes/fragments/Fixed-20261105-162000.000000000.yaml',
    '.changes/fragments/mobile.Fixed.20261105-160152.yaml',
    '.github/workflows/ci.yml',
    '.github/workflows/mobile-build.yml',
    '.github/workflows/lace-next-mobile.yml',
    'sonar-project.properties',
    'scripts/ci-release-sdk-exclusions.mjs',
    'docs/app-release-sdk-exception.md',
  ])('permits the audited app input %s', file => {
    expect(releaseSdkExclusions({ ...release, changedFiles: [file] })).toEqual(
      exclusions,
    );
  });

  it('defers only the SDK projects for the complete LW-15790 backport', () => {
    expect(
      releaseSdkExclusions({
        ...release,
        changedFiles: [
          ...addressMovementFiles,
          '.changes/fragments/extension.Fixed.20261116-141614.644485313.yaml',
          '.changes/fragments/mobile.Fixed.20261116-141614.833797272.yaml',
          '.changes/fragments/next.Fixed.20261117-144916.437997604.yaml',
          'apps/lace-mobile-storybook/stories/integration/dapp-sign-tx.stories.tsx',
          'apps/lace-mobile-storybook/stories/integration/data/lw15790-redemption.json',
          'apps/lace-mobile-storybook/stories/integration/data/lw15790-redemption.ts',
          'apps/lace-next/src/dapp/cardano-review/inspection.ts',
          'apps/lace-next/test/cardano-review-address-movements.test.ts',
          'apps/lace-next/test/fixtures/lw15790-redemption.json',
          'scripts/ci-release-sdk-exclusions.mjs',
          'scripts/__tests__/ci-release-sdk-exclusions.test.mjs',
          'docs/app-release-sdk-exception.md',
        ],
      }),
    ).toEqual(exclusions);
  });

  it.each([
    'packages/module/dapp-connector-cardano/src/common/utils/transaction-inspector.ts',
    'packages/module/dapp-connector-cardano/src/common/hooks/useSignTxData.ts',
    'packages/module/dapp-connector-cardano/src/common/components/sign-tx/UnknownSection.tsx',
    'packages/module/dapp-connector-cardano/src/browser/store/side-effects.ts',
    'packages/module/dapp-connector-cardano/src/index.ts',
    'packages/module/dapp-connector-cardano/package.json',
    'packages/module/dapp-connector-cardano/project.json',
  ])('restores full checks when signing changes also touch %s', file => {
    expect(
      releaseSdkExclusions({
        ...release,
        changedFiles: [...addressMovementFiles, file],
      }),
    ).toEqual([]);
  });

  it.each([
    'apps/lace-sdk/src/sign-midnight-tx.ts',
    'apps/lace-sdk/test/midnight-transfer.test.ts',
    'apps/lace-sdk/scripts/build.sh',
    'apps/lace-sdk/README.md',
    'apps/lace-sdk-site/src/index.ts',
    'apps/lace-sdk-example-passport/src/App.tsx',
    'apps/lace-cardano/src/index.ts',
    'packages/module/midnight-sync/src/index.ts',
    'apps/lace-extension/src/midnight.ts',
    'packages/lib/vendor/src/index.ts',
    'packages/module/passport-account/src/index.ts',
    'packages/lib/cardano-core/src/index.ts',
    'packages/next/core/src/store/core.ts',
    'package.json',
    'package-lock.json',
    'tsconfig.base.json',
    'nx.json',
    'apps/lace-mobile/package.json',
    'apps/lace-mobile/eas.json',
    'apps/lace-next/metro.config.js',
    'packages/next/ui/project.json',
    'packages/next/ui/vitest.config.js',
    'scripts/fix-wallet-sdk-abstractions.js',
    'ci/setup.sh',
    'unknown-path.ts',
    'apps/lace-mobile/src/unknown\npackages/module/midnight-sync/src/index.ts',
  ])('restores full checks when the app change also touches %s', file => {
    expect(
      releaseSdkExclusions({
        ...release,
        changedFiles: ['apps/lace-mobile/app.json', file],
      }),
    ).toEqual([]);
  });

  it.each([
    { eventName: 'pull_request', baseRef: 'main' },
    { eventName: 'push', baseRef: 'release/2.5.x' },
    { eventName: 'workflow_dispatch', baseRef: 'release/2.5.x' },
    { eventName: undefined, baseRef: undefined },
  ])('keeps full checks for $eventName into $baseRef', context => {
    expect(
      releaseSdkExclusions({
        ...context,
        changedFiles: ['apps/lace-mobile/app.json'],
      }),
    ).toEqual([]);
  });

  it('does not exempt an empty diff', () => {
    expect(releaseSdkExclusions({ ...release, changedFiles: [] })).toEqual([]);
  });

  it('reads the real git diff and refuses moving SDK code to a documentation path', () => {
    const directory = mkdtempSync(join(tmpdir(), 'release-sdk-scope-'));
    const git = (...args) =>
      execFileSync(
        'git',
        [
          '-c',
          'core.hooksPath=/dev/null',
          '-c',
          'user.name=CI test',
          '-c',
          'user.email=ci@example.test',
          ...args,
        ],
        { cwd: directory, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
      ).trim();
    const write = (path, content) => {
      mkdirSync(dirname(join(directory, path)), { recursive: true });
      writeFileSync(join(directory, path), content);
    };
    try {
      git('init');
      write('apps/lace-mobile/app.json', '{}');
      write('apps/lace-sdk/src/sign-midnight-tx.ts', 'export const sign = 1;');
      git('add', '.');
      git('commit', '-m', 'baseline');
      const base = git('rev-parse', 'HEAD');
      write('apps/lace-mobile/app.json', '{"expo":{"version":"2.5.2"}}');
      git('add', '.');
      git('commit', '-m', 'app version');
      const environment = {
        ...process.env,
        GITHUB_EVENT_NAME: release.eventName,
        GITHUB_BASE_REF: release.baseRef,
        RELEASE_BASE_SHA: base,
      };
      const invoke = () =>
        execFileSync(process.execPath, [cli], {
          cwd: directory,
          env: environment,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      expect(invoke()).toBe(exclusions.join(','));
      git('mv', 'apps/lace-sdk/src/sign-midnight-tx.ts', 'renamed.md');
      git('commit', '-m', 'move SDK code');
      expect(invoke()).toBe('');
      environment.RELEASE_BASE_SHA = 'missing-revision';
      expect(invoke).toThrow();
      delete environment.RELEASE_BASE_SHA;
      expect(invoke).toThrow();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
