import { describe, expect, it, vi } from 'vitest';

vi.mock('posthog-react-native', () => ({
  default: vi.fn().mockImplementation(() => ({
    capture: vi.fn(),
    identify: vi.fn(),
    reloadFeatureFlagsAsync: vi.fn().mockResolvedValue(undefined),
    getFeatureFlagsAndPayloads: vi
      .fn()
      .mockReturnValue({ flags: {}, payloads: {} }),
  })),
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

describe('posthog-client-react-native default event properties', () => {
  it('includes platform, osVersion, and appVersion', () => {
    const { getDefaultPostHogEventProperties } = makeInit();

    expect(getDefaultPostHogEventProperties()).toEqual({
      platform: 'ios',
      osVersion: '17.4',
      appVersion: '2.1.0',
    });
  });
});
