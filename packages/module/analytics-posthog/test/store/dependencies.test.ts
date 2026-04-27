import { FeatureFlagKey } from '@lace-contract/feature';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import initializeStore from '../../src/store/init';

import type { AnalyticsEventName } from '@lace-contract/analytics';
import type { ModuleInitProps } from '@lace-contract/module';
import type { PostHogClient } from '@lace-contract/posthog';
import type { Mocked } from 'vitest';

const initializeDependencies = (
  loadedFeatureFlags: ModuleInitProps['runtime']['features']['loaded']['featureFlags'],
) => {
  const { sideEffectDependencies } = initializeStore(
    {
      runtime: {
        features: {
          loaded: {
            featureFlags: loadedFeatureFlags,
          },
        },
      },
    } as unknown as ModuleInitProps,
    { logger: dummyLogger },
  );
  return {
    initializePostHogDependencies:
      sideEffectDependencies!.initializePostHogAnalytics!,
    trackAnalyticsEvent: sideEffectDependencies!.trackAnalyticsEvent!,
  };
};

describe('analytics-posthog/dependencies', () => {
  let posthog: Mocked<PostHogClient>;

  beforeEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'node.js',
      },
      configurable: true,
    });

    Object.defineProperty(global, 'location', {
      value: {
        href: 'http://localhost',
      },
      configurable: true,
    });

    posthog = {
      captureEvent: vi.fn(),
      getFeatureFlags: vi.fn(),
      identify: vi.fn(),
    } as Mocked<PostHogClient>;
  });

  describe('Analytics Event Tracking', () => {
    it('should send analytics events with merged feature flag properties', async () => {
      const { trackAnalyticsEvent, initializePostHogDependencies } =
        initializeDependencies([
          { key: FeatureFlagKey('feat1') },
          { key: FeatureFlagKey('feat2') },
        ]);
      initializePostHogDependencies(
        posthog,
        vi.fn().mockReturnValue({
          posthogEventDefaultProperty: 'posthogEventDefaultProperty',
        }),
      );

      const eventName: AnalyticsEventName =
        'onboarding | new wallet | options | view';
      const eventPayload = { item: 'value' };
      const user = { id: 'user123' };

      // Simulate tracking an event
      trackAnalyticsEvent(
        { eventName, payload: eventPayload },
        { user },
      ).subscribe();

      // Wait to allow any asynchronous operations to complete
      expect(posthog.captureEvent).toHaveBeenCalledWith({
        distinctId: user.id,
        event: eventName,
        properties: {
          ...eventPayload,
          '$feature/feat1': true,
          '$feature/feat2': true,
          posthogEventDefaultProperty: 'posthogEventDefaultProperty',
        },
      });
    });
  });
});
