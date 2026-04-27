import { analyticsActions } from '@lace-contract/analytics';
import { featuresActions } from '@lace-contract/feature';
import { FeatureFlagKey } from '@lace-contract/feature';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, expect, it, vi } from 'vitest';

import {
  identifyUser,
  initializePostHogAnalyticsDependencies,
  trackFeatureInteraction,
  trackFeatureView,
} from '../../src/store/side-effects';

import type { PostHogAnalyticsDependencies } from '../../src/store';
import type { PostHogClient } from '@lace-contract/posthog';

const actions = { ...featuresActions, ...analyticsActions };

describe('Side Effects', () => {
  describe('initializePostHogDependencies', () => {
    it('should subscribe to analytics user ID changes and initialize PostHog dependencies', async () => {
      const stubPosthog = {} as PostHogClient;
      let mockInitializePostHogDependencies: (posthog: PostHogClient) => void;

      const promise = new Promise<void>(resolve => {
        mockInitializePostHogDependencies = vi.fn(posthog => {
          expect(posthog).toBe(stubPosthog);
          resolve(); // resolve promise when called
        });
      });

      testSideEffect(
        initializePostHogAnalyticsDependencies,
        ({ hot, expectObservable }) => {
          return {
            actionObservables: {
              analytics: {
                load$: hot('-a', {
                  a: actions.analytics.load({
                    id: '1',
                  }),
                }),
              },
            },
            dependencies: {
              initializePostHogAnalytics: mockInitializePostHogDependencies,
              posthog: stubPosthog,
              actions,
            } as PostHogAnalyticsDependencies,
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('|'); // no emissions
            },
          };
        },
      );

      await promise; // wait until expect inside mock passes
    });
  });

  describe('trackFeatureView', () => {
    it('should track a feature view event when a featureView action is dispatched', () => {
      testSideEffect(trackFeatureView, ({ hot, expectObservable }) => {
        return {
          actionObservables: {
            features: {
              featureView$: hot('-a', {
                a: actions.features.featureView(FeatureFlagKey('key')),
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.analytics.trackEvent({
                eventName: '$feature_view',
                payload: { feature_flag: 'key' },
              }),
            });
          },
        };
      });
    });
  });

  describe('trackFeatureInteraction', () => {
    it('should track a feature interaction event when a featureInteraction action is dispatched', () => {
      testSideEffect(trackFeatureInteraction, ({ hot, expectObservable }) => {
        return {
          actionObservables: {
            features: {
              featureInteraction$: hot('-a', {
                a: actions.features.featureInteraction(FeatureFlagKey('key')),
              }),
            },
          },
          dependencies: { actions },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.analytics.trackEvent({
                eventName: '$feature_interaction',
                payload: {
                  feature_flag: 'key',
                  $set: { [`$feature_interaction/key`]: true },
                },
              }),
            });
          },
        };
      });
    });
  });

  describe('identifyUser', () => {
    it('calls `posthog.identify()` with received user id', () => {
      const identify = vi.fn();
      testSideEffect(identifyUser, ({ cold, expectObservable, flush }) => ({
        stateObservables: {
          analytics: {
            selectAnalyticsUser$: cold('aab', {
              a: {
                id: 'user id',
              },
              b: {
                id: 'different user id',
              },
            }),
          },
        },
        dependencies: {
          posthog: {
            captureEvent: vi.fn(),
            getFeatureFlags: vi.fn(),
            identify,
          },
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
          flush();

          expect(identify).toHaveBeenCalledTimes(2);
          expect(identify).toHaveBeenNthCalledWith(1, 'user id');
          expect(identify).toHaveBeenNthCalledWith(2, 'different user id');
        },
      }));
    });
  });
});
