import fs from 'node:fs';
import path from 'node:path';

import { afterEach, expect, it, vi } from 'vitest';

import defaultFeatureFlags from '../src/feature-flags';

import testFeatureFlags from './feature-flags.hermetic';

const appRoot = path.resolve(__dirname, '..');
const defaultsPath = path.join(appRoot, 'src/feature-flags.ts');
const testFlagsPath = path.join(appRoot, 'test/feature-flags.hermetic.ts');
const overridePath = path.join(appRoot, 'src/feature-flags.override.ts');
const existsSync = fs.existsSync;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it.each([undefined, '1'])(
  'keeps Metro E2E flags opt-in (%s)',
  async enabled => {
    vi.stubEnv('LACE_E2E_FEATURE_FLAGS', enabled);
    vi.spyOn(fs, 'existsSync').mockImplementation(file =>
      file === overridePath ? false : existsSync(file),
    );
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = await require('../metro.config.js');
    const request = {
      originModulePath: path.join(appRoot, 'src/util/config.ts'),
      resolveRequest: vi.fn().mockReturnValue({
        type: 'sourceFile',
        filePath: defaultsPath,
      }),
    };
    expect(
      config.resolver.resolveRequest(request, '../feature-flags', 'web'),
    ).toEqual({
      type: 'sourceFile',
      filePath: enabled ? testFlagsPath : defaultsPath,
    });
    request.originModulePath = testFlagsPath;
    expect(
      config.resolver.resolveRequest(request, '../src/feature-flags', 'web'),
    ).toEqual({ type: 'sourceFile', filePath: defaultsPath });
  },
);

it.each([undefined, '1'])('keeps webpack E2E flags opt-in (%s)', enabled => {
  vi.stubEnv('LACE_E2E_FEATURE_FLAGS', enabled);
  vi.spyOn(fs, 'existsSync').mockImplementation(file =>
    file === overridePath ? false : existsSync(file),
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { baseConfig } = require('../webpack/base/common.webpack.config.js');
  const plugin = baseConfig.plugins.find(
    (entry: { resourceRegExp?: RegExp }) =>
      entry.resourceRegExp?.source === 'feature-flags$',
  );
  const request = {
    context: path.join(appRoot, 'src/util'),
    request: '../feature-flags',
  };
  plugin.newResource(request);
  expect(request.request).toBe(enabled ? testFlagsPath : '../feature-flags');
  const baseRequest = {
    context: path.dirname(testFlagsPath),
    request: '../src/feature-flags',
  };
  plugin.newResource(baseRequest);
  expect(baseRequest.request).toBe('../src/feature-flags');
});

it('adds the five opt-in features only to the E2E fixture', () => {
  const defaults = defaultFeatureFlags.map(flag => flag.key);
  expect(
    testFeatureFlags
      .filter(flag => !defaults.includes(flag.key))
      .map(flag => flag.key),
  ).toEqual([
    'MIGRATE_WALLET',
    'NOTIFICATION_CENTER',
    'SWAP_CENTER',
    'EARN_REWARDS',
    'REALFI',
  ]);
  expect(testFeatureFlags.slice(0, defaultFeatureFlags.length)).toEqual(
    defaultFeatureFlags,
  );
});
