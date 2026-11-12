import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeSideEffectDependencies } from '../src/store/dependencies';

const sdk = vi.hoisted(() => ({
  getAllFlagsAndPayloads: vi.fn(),
  fetch: undefined as ((url: string) => Promise<Response>) | undefined,
}));

vi.mock('posthog-node', () => ({
  PostHog: vi
    .fn()
    // eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions -- invoked as a constructor
    .mockImplementation(function (
      _token: string,
      options: { fetch: (url: string) => Promise<Response> },
    ) {
      sdk.fetch = options.fetch;
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

  it.each(['offline', 'http', 'incomplete', 'invalid'])(
    'rejects an SDK empty fallback after a %s response',
    async failure => {
      const client = makeClient();
      const fetchMock = vi.spyOn(globalThis, 'fetch');
      if (failure === 'offline')
        fetchMock.mockRejectedValue(new Error('offline'));
      else
        fetchMock.mockResolvedValue(
          new Response(failure === 'invalid' ? 'invalid' : '{}', {
            status: failure === 'http' ? 503 : 200,
          }),
        );
      sdk.getAllFlagsAndPayloads.mockImplementation(async () => {
        await sdk.fetch?.('https://example.test/flags/').catch(() => undefined);
        return { featureFlags: {}, featureFlagPayloads: {} };
      });
      try {
        await expect(client.getFeatureFlags('user')).rejects.toThrow(
          'refusing',
        );
      } finally {
        fetchMock.mockRestore();
      }
    },
  );

  it('accepts an authoritative empty flag response', async () => {
    const client = makeClient();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ flags: {} })));
    sdk.getAllFlagsAndPayloads.mockImplementation(async () => {
      await sdk.fetch?.('https://example.test/flags/');
      return { featureFlags: {}, featureFlagPayloads: {} };
    });
    try {
      await expect(client.getFeatureFlags('user')).resolves.toEqual({
        featureFlags: {},
        featureFlagPayloads: {},
      });
    } finally {
      fetchMock.mockRestore();
    }
  });
});
