import { createTestScheduler } from '@cardano-sdk/util-dev';
import { Seconds } from '@lace-sdk/util';
import { NEVER } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import initializeStore from '../../src/store/init';

import type { ModuleInitProps } from '@lace-contract/module';
import type { PostHogClient } from '@lace-contract/posthog';
import type { Mocked } from 'vitest';

const initializeDependencies = (
  featureFlagCheckFrequency: ModuleInitProps['runtime']['config']['featureFlagCheckFrequency'],
) => {
  const { sideEffectDependencies } = initializeStore(
    {
      runtime: {
        config: { featureFlagCheckFrequency },
      },
    } as ModuleInitProps,
    { logger: dummyLogger },
  );
  return {
    initializePostHogFeatureDependencies:
      sideEffectDependencies!.initializePostHogFeatureDependencies!,
    featureFlags$: sideEffectDependencies!.featureFlags$!,
  };
};

const flagsResponse = {
  featureFlags: { feat1: true, feat2: false },
  featureFlagPayloads: {},
};
const flagsEmission = [{ key: 'feat1' }];

describe('feature-posthog/dependencies', () => {
  describe('Feature Flags Streaming', () => {
    it('should periodically fetch feature flags based on the distinct ID and emit them', () => {
      createTestScheduler().run(({ cold, hot, expectObservable }) => {
        const getFeatureFlags = vi
          .fn()
          .mockReturnValue(cold('a|', { a: flagsResponse }));
        const posthog = {
          captureEvent: vi.fn(),
          getFeatureFlags,
          identify: vi.fn(),
        } as unknown as Mocked<PostHogClient>;

        const distinctId$ = hot<string>('-a', { a: 'user1' });

        const { featureFlags$, initializePostHogFeatureDependencies } =
          initializeDependencies(Seconds(1));
        initializePostHogFeatureDependencies(posthog, distinctId$, NEVER);

        expectObservable(featureFlags$, '^-!').toBe('-a', {
          a: flagsEmission,
        });
      });
    });

    it('should keep polling after a fetch error', () => {
      const getFeatureFlags = vi.fn();

      createTestScheduler().run(({ cold, hot, expectObservable }) => {
        getFeatureFlags
          .mockReturnValueOnce(cold('#'))
          .mockReturnValueOnce(cold('a|', { a: flagsResponse }));
        const posthog = {
          captureEvent: vi.fn(),
          getFeatureFlags,
          identify: vi.fn(),
        } as unknown as Mocked<PostHogClient>;

        const distinctId$ = hot<string>('-a', { a: 'user1' });
        const featureFlagRefreshTrigger$ = hot<void>('-----a', {
          a: undefined,
        });

        const { featureFlags$, initializePostHogFeatureDependencies } =
          initializeDependencies(Seconds(3600));
        initializePostHogFeatureDependencies(
          posthog,
          distinctId$,
          featureFlagRefreshTrigger$,
        );

        expectObservable(featureFlags$, '^-----!').toBe('-----a', {
          a: flagsEmission,
        });
      });

      expect(getFeatureFlags).toHaveBeenCalledTimes(2);
    });

    it('should fetch feature flags when refresh trigger emits', () => {
      const getFeatureFlags = vi.fn();

      createTestScheduler().run(({ cold, hot, expectObservable }) => {
        getFeatureFlags.mockReturnValue(cold('a|', { a: flagsResponse }));
        const posthog = {
          captureEvent: vi.fn(),
          getFeatureFlags,
          identify: vi.fn(),
        } as unknown as Mocked<PostHogClient>;

        const distinctId$ = hot<string>('-a', { a: 'user1' });
        const featureFlagRefreshTrigger$ = hot<void>('-----a', {
          a: undefined,
        });

        const { featureFlags$, initializePostHogFeatureDependencies } =
          initializeDependencies(Seconds(3600));
        initializePostHogFeatureDependencies(
          posthog,
          distinctId$,
          featureFlagRefreshTrigger$,
        );

        expectObservable(featureFlags$, '^-----!').toBe('-a---a', {
          a: flagsEmission,
        });
      });

      expect(getFeatureFlags).toHaveBeenCalledTimes(2);
    });
  });
});
