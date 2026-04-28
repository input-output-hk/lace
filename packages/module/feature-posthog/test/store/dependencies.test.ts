import { Seconds } from '@lace-sdk/util';
import { Subject } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import initializeStore from '../../src/store/init';

import type { FeatureFlag } from '@lace-contract/feature';
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

describe('feature-posthog/dependencies', () => {
  let posthog: Mocked<PostHogClient>;

  beforeEach(() => {
    posthog = {
      captureEvent: vi.fn(),
      getFeatureFlags: vi.fn().mockResolvedValue({
        featureFlags: { feat1: true, feat2: false },
        featureFlagPayloads: {},
      }),
      identify: vi.fn(),
    } as Mocked<PostHogClient>;
  });

  describe('Feature Flags Streaming', () => {
    it('should periodically fetch feature flags based on the distinct ID and emit them', async () => {
      const initialized = new Promise<void>((resolve, reject) => {
        const distinctId$ = new Subject<string>();

        const { featureFlags$, initializePostHogFeatureDependencies } =
          initializeDependencies(Seconds(1));

        initializePostHogFeatureDependencies(posthog, distinctId$);

        const featureFlags: FeatureFlag[][] = [];
        const subscription = featureFlags$.subscribe({
          next: flags => {
            featureFlags.push(flags);
            expect(featureFlags).toEqual([[{ key: 'feat1' }]]);

            // Complete the test
            subscription.unsubscribe();
            resolve();
          },
          error: (error: Error) => {
            subscription.unsubscribe();
            reject(error);
          },
          complete: () => {
            resolve();
          },
        });

        distinctId$.next('user1');
      });

      await initialized;
    });
  });
});
