import { createTestScheduler } from '@cardano-sdk/util-dev';
import { Seconds } from '@lace-lib/util';
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

    it.each([{}, { BUY_FLOW: false }])(
      'emits disabled flags from a successful response: %j',
      disabledFlags => {
        createTestScheduler().run(({ cold, hot, expectObservable }) => {
          const posthog = {
            getFeatureFlags: vi
              .fn()
              .mockReturnValueOnce(
                cold('a|', { a: { featureFlags: { BUY_FLOW: true } } }),
              )
              .mockReturnValueOnce(
                cold('a|', { a: { featureFlags: disabledFlags } }),
              ),
          } as unknown as PostHogClient;
          const { featureFlags$, initializePostHogFeatureDependencies } =
            initializeDependencies(Seconds(3600));
          initializePostHogFeatureDependencies(
            posthog,
            hot('-a', { a: 'user1' }),
            hot('-----a', { a: undefined }),
          );
          expectObservable(featureFlags$, '^-----!').toBe('-a---b', {
            a: [{ key: 'BUY_FLOW' }],
            b: [],
          });
        });
      },
    );

    it('ignores incomplete responses without a featureFlags field', () => {
      createTestScheduler().run(({ cold, hot, expectObservable }) => {
        const posthog = {
          getFeatureFlags: vi.fn(() => cold('a|', { a: {} })),
        } as unknown as PostHogClient;
        const { featureFlags$, initializePostHogFeatureDependencies } =
          initializeDependencies(Seconds(3600));
        initializePostHogFeatureDependencies(
          posthog,
          hot('-a', { a: 'user1' }),
          NEVER,
        );
        expectObservable(featureFlags$, '^-----!').toBe('');
      });
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
