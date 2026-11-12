import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('posthog-react-native', () => ({
  // eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions -- invoked with `new`, which an arrow function cannot be
  default: vi.fn().mockImplementation(function () {
    return {
      capture: vi.fn(),
      identify: vi.fn(),
      setPersonPropertiesForFlags: vi.fn(),
      reloadFeatureFlagsAsync: vi.fn().mockResolvedValue({}),
      getFeatureFlagsAndPayloads: vi
        .fn()
        .mockReturnValue({ flags: {}, payloads: {} }),
    };
  }),
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '17.4' },
}));

vi.mock('expo-application', () => ({
  nativeApplicationVersion: '2.1.0',
}));

import { initializeSideEffectDependencies } from '../../src/store/dependencies';

const makeInit = () =>
  initializeSideEffectDependencies(
    {
      runtime: {
        config: {
          postHogApiToken: 'test-token',
          postHogUrl: 'https://example.test',
        },
      },
    } as never,
    {} as never,
  );

describe.each(['ios', 'android'] as const)('PostHog on %s', platform => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: platform });
  });

  it('includes platform, osVersion, and appVersion', () => {
    const { getDefaultPostHogEventProperties } = makeInit();

    expect(getDefaultPostHogEventProperties()).toEqual({
      platform,
      osVersion: '17.4',
      appVersion: '2.1.0',
    });
  });

  it('adds platform to SDK event properties without losing native metadata', () => {
    makeInit();
    const options = vi.mocked(PostHog).mock.calls[0][1]!;
    const customAppProperties = options.customAppProperties;

    expect(typeof customAppProperties).toBe('function');
    if (typeof customAppProperties !== 'function')
      throw new Error('Expected property callback');
    expect(
      customAppProperties({ $os_name: 'native OS', $app_version: '2.1.0' }),
    ).toEqual({
      $os_name: 'native OS',
      $app_version: '2.1.0',
      platform,
    });
  });

  it('supplies platform for flags before identification without an extra reload', () => {
    makeInit();
    const sdk = vi.mocked(PostHog).mock.results[0].value as PostHog;

    expect(sdk.setPersonPropertiesForFlags).toHaveBeenCalledWith(
      { platform },
      false,
    );
    expect(sdk.identify).not.toHaveBeenCalled();
    expect(sdk.reloadFeatureFlagsAsync).not.toHaveBeenCalled();
  });

  it('keeps an unavailable SDK refresh distinct from a successful empty flag set', async () => {
    const { posthog } = makeInit();
    const sdk = vi.mocked(PostHog).mock.results[0].value as PostHog;
    vi.mocked(sdk.reloadFeatureFlagsAsync).mockResolvedValueOnce(undefined);
    await expect(posthog.getFeatureFlags('test-user')).resolves.toEqual({});
    await expect(posthog.getFeatureFlags('test-user')).resolves.toEqual({
      featureFlags: {},
      featureFlagPayloads: {},
    });
  });

  it('propagates refresh failures so cached flags are not mistaken for a successful empty response', async () => {
    const { posthog } = makeInit();
    const sdk = vi.mocked(PostHog).mock.results[0].value as PostHog;
    const error = new Error('Offline');
    vi.mocked(sdk.reloadFeatureFlagsAsync).mockRejectedValueOnce(error);
    await expect(posthog.getFeatureFlags('test-user')).rejects.toBe(error);
  });

  it('identifies the current device platform while preserving person properties', () => {
    const { posthog } = makeInit();
    const sdk = vi.mocked(PostHog).mock.results[0].value as PostHog;

    posthog.identify('test-user', {
      platform: 'stale-platform',
      language: 'en',
    });

    expect(sdk.identify).toHaveBeenCalledWith('test-user', {
      platform,
      language: 'en',
    });
  });
});
