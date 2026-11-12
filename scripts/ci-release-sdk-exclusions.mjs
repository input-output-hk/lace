#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// shortcut: app releases may defer the unfinished SDK migration until LW-15767.
// Unknown paths and dependency/configuration changes restore the full SDK gates.
const appPaths = [
  'apps/lace-extension/',
  'apps/lace-mobile/',
  'apps/lace-next/',
  'apps/lace-extension-e2e/',
  'apps/lace-mobile-storybook/',
  'apps/lace-next-e2e/',
  'packages/contract/feature/',
  'packages/contract/network/',
  'packages/module/app-mobile/',
  'packages/module/blockchain-cardano-ui/',
  'packages/module/feature-posthog/',
  'packages/module/posthog-client-extension/',
  'packages/module/posthog-client-react-native/',
  'packages/module/posthog-client-web/',
  'packages/next/provider-posthog/',
  'packages/next/ui/',
  'packages/next/core/test/',
];

const appFiles = new Set([
  'apps/lace-extension-carbon/src/app/feature-flags.ts',
  'apps/lace-extension-guest/src/app/feature-flags.ts',
  'packages/next/core/src/domain/featureFlags.ts',
  'packages/next/core/src/store/slices/featureSlice.ts',
  'packages/lib/util-dev-storybook/src/stubs/midnight-wallet.ts',
  'packages/lib/util-dev-storybook/src/stubs/posthog-client.ts',
  '.github/workflows/ci.yml',
  '.github/workflows/sdk-standalone.yml',
  '.github/workflows/mobile-build.yml',
  '.github/workflows/lace-next-mobile.yml',
  'sonar-project.properties',
  'scripts/ci-release-sdk-exclusions.mjs',
  'scripts/ci-shard-projects.mjs',
  'scripts/__tests__/ci-release-sdk-exclusions.test.mjs',
  'scripts/__tests__/ci-shard-projects.test.mjs',
  'scripts/__tests__/ci-workflow.test.mjs',
]);

const canDefer = file => {
  if (file.startsWith('apps/lace-sdk/.changes/fragments/'))
    return file.endsWith('.yaml');
  if (/^apps\/lace-(sdk|cardano)(?:[/-]|$)/.test(file)) return false;
  if (file.toLowerCase().includes('midnight') && !appFiles.has(file))
    return false;
  if (
    /(^|\/)(?:package(?:-lock)?\.json|project\.json|(?:tsconfig|babel|metro|vitest|eslint)[^/]*|eas\.json)$/.test(
      file,
    )
  )
    return false;
  return (
    file.endsWith('.md') ||
    /^\.changes\/fragments\/(?:extension|mobile|next)\.[^/]+\.yaml$/.test(
      file,
    ) ||
    appFiles.has(file) ||
    appPaths.some(prefix => file.startsWith(prefix))
  );
};

export const releaseSdkExclusions = ({ eventName, baseRef, changedFiles }) =>
  eventName === 'pull_request' &&
  baseRef === 'release/2.5.x' &&
  changedFiles.length > 0 &&
  changedFiles.every(canDefer)
    ? ['lace-sdk', 'lace-sdk-example-passport', 'lace-sdk-site']
    : [];

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { GITHUB_EVENT_NAME: eventName, GITHUB_BASE_REF: baseRef } =
    process.env;
  const isReleasePull =
    eventName === 'pull_request' && baseRef === 'release/2.5.x';
  const base = process.env.RELEASE_BASE_SHA;
  if (isReleasePull && !base) throw new Error('RELEASE_BASE_SHA must be set');
  const changedFiles = isReleasePull
    ? execFileSync(
        'git',
        ['diff', '--no-renames', '--name-only', '-z', base, 'HEAD'],
        { encoding: 'utf8' },
      )
        .split('\0')
        .filter(Boolean)
    : [];
  process.stdout.write(
    releaseSdkExclusions({ eventName, baseRef, changedFiles }).join(','),
  );
}
