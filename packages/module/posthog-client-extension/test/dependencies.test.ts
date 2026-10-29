import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeSideEffectDependencies } from '../src/store/dependencies';

const sdk = vi.hoisted(() => ({
  getAllFlagsAndPayloads: vi.fn(),
}));

vi.mock('posthog-node', () => ({
  // eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions -- invoked as a constructor
  PostHog: vi.fn().mockImplementation(function () {
    return sdk;
  }),
}));

vi.mock('webextension-polyfill', () => ({
  runtime: { getManifest: () => ({ version: '2.5.0' }) },
}));

const makeClient = () =>
  initializeSideEffectDependencies(
    {
      runtime: {
        config: {
          postHogApiToken: 'test-token',
          postHogUrl: 'https://example.test',
        },
      },
    } as never,
    { logger: { warn: vi.fn() } } as never,
  ).posthog;

describe('extension feature flag version targeting', () => {
  beforeEach(() => {
    sdk.getAllFlagsAndPayloads.mockReset();
  });

  it('passes the installed version on initial and subsequent flag requests', async () => {
    const response = {
      featureFlags: { CNIGHT_DESIGNATION: true },
      featureFlagPayloads: {},
    };
    sdk.getAllFlagsAndPayloads.mockResolvedValue(response);
    const client = makeClient();

    expect(sdk.getAllFlagsAndPayloads).not.toHaveBeenCalled();
    for (const distinctId of ['first-user', 'second-user']) {
      await expect(client.getFeatureFlags(distinctId)).resolves.toEqual(
        response,
      );
      expect(sdk.getAllFlagsAndPayloads).toHaveBeenLastCalledWith(distinctId, {
        personProperties: { $app_version: '2.5.0' },
      });
    }
    expect(sdk.getAllFlagsAndPayloads).toHaveBeenCalledTimes(2);
  });

  it('preserves flag request failures', async () => {
    sdk.getAllFlagsAndPayloads.mockRejectedValue(new Error('offline'));
    await expect(makeClient().getFeatureFlags('user')).rejects.toThrow(
      'offline',
    );
  });
});
