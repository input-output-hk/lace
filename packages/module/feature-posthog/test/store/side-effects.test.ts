import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import { initializePostHogFeatureDependencies } from '../../src/store/side-effects';

import type { PostHogFeatureDependencies } from '../../src/store';
import type { PostHogClient } from '@lace-contract/posthog';
import type { Mocked } from 'vitest';

describe('Side Effects', () => {
  const stubPosthog = {} as PostHogClient;

  describe('initializePostHogDependencies', () => {
    it('should subscribe to analytics user ID changes and initialize PostHog dependencies', async () => {
      const initialized = new Promise<void>((resolve, reject) => {
        const mockInitializePostHogDependencies: Mocked<
          PostHogFeatureDependencies['initializePostHogFeatureDependencies']
        > = vi.fn((posthog, distinctId$) => {
          try {
            expect(posthog).toBe(stubPosthog);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            distinctId$.subscribe({
              next: (distinctId: unknown) => {
                expect(distinctId).toBeDefined();
                expect(distinctId).toBeTruthy();
                expect(distinctId).toEqual('1');
                resolve();
              },
              error: (error: Error) => {
                reject(error);
              },
            });
          } catch (error) {
            reject(error as Error);
          }
        });

        testSideEffect(
          initializePostHogFeatureDependencies,
          ({ hot, expectObservable }) => {
            return {
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
              } as PostHogFeatureDependencies,
              assertion: sideEffect$ => {
                expectObservable(sideEffect$).toBe('|');
              },
            };
          },
        );
      });

      await initialized;
    });
  });
});
