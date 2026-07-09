import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { initializePostHogFeatureDependencies } from '../../src/store/side-effects';

import type { PostHogFeatureDependencies } from '../../src/store';
import type { PostHogClient } from '@lace-contract/posthog';
import type { Observable } from 'rxjs';
import type { Mocked } from 'vitest';

describe('Side Effects', () => {
  const stubPosthog = {} as PostHogClient;

  describe('initializePostHogDependencies', () => {
    it('subscribes to analytics user ID changes and initializes PostHog dependencies with the refresh trigger', () => {
      let capturedDistinctId$: Observable<string> | undefined;
      const mockInitializePostHogDependencies: Mocked<
        PostHogFeatureDependencies['initializePostHogFeatureDependencies']
      > = vi.fn((_posthog: PostHogClient, distinctId$: Observable<string>) => {
        capturedDistinctId$ = distinctId$;
      });

      testSideEffect(
        initializePostHogFeatureDependencies,
        ({ hot, expectObservable }) => ({
          actionObservables: {},
          stateObservables: {
            analytics: {
              selectAnalyticsUser$: hot('-a', {
                a: { id: '1' },
              }),
            },
          },
          dependencies: {
            initializePostHogFeatureDependencies:
              mockInitializePostHogDependencies,
            posthog: stubPosthog,
            featureFlagRefreshTrigger$: NEVER,
          } as PostHogFeatureDependencies,
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('|');
            expectObservable(capturedDistinctId$!).toBe('-a', { a: '1' });
          },
        }),
      );

      expect(mockInitializePostHogDependencies).toHaveBeenCalledTimes(1);
      expect(mockInitializePostHogDependencies).toHaveBeenCalledWith(
        stubPosthog,
        expect.anything(),
        NEVER,
      );
    });
  });
});
