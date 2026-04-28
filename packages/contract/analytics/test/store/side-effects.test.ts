import { testSideEffect } from '@lace-lib/util-dev';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { analyticsActions as actions } from '../../src';
import {
  trackAnalyticsEvents,
  generateUserId,
} from '../../src/store/side-effects';

import type { Observable } from 'rxjs';
import type { Mock } from 'vitest';

// Define types for mocks
type AnalyticsUser = { id: string };
type AnalyticsEvent = { eventName: string; payload?: Record<string, unknown> };

// Type for the tracking function mock
type TrackAnalyticsEventFunction = (
  event: AnalyticsEvent,
  context: { user: AnalyticsUser },
) => Observable<void>;
type MockTrackAnalyticsEvent = Mock<TrackAnalyticsEventFunction>;

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid'),
}));

describe('Analytics Side Effects', () => {
  let mockTrackAnalyticsEvent: MockTrackAnalyticsEvent;

  beforeEach(() => {
    mockTrackAnalyticsEvent = vi.fn<TrackAnalyticsEventFunction>(() =>
      of(undefined),
    );
  });

  it('should generate user id', () => {
    testSideEffect(generateUserId, ({ hot, expectObservable }) => ({
      stateObservables: {
        analytics: {
          selectAnalyticsUser$: hot('ab', {
            a: undefined,
            b: { id: 'test-uuid' },
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('(a|)', {
          a: actions.analytics.load({ id: 'test-uuid' }),
        });
      },
    }));
  });

  it('should track analytics events', () => {
    testSideEffect(
      trackAnalyticsEvents,
      ({ flush, hot, expectObservable }) => ({
        actionObservables: {
          analytics: {
            trackEvent$: hot('-a-', {
              a: actions.analytics.trackEvent({
                eventName: 'onboarding | new wallet | options | view',
                payload: { data: 'data' },
              }),
            }),
          },
        },
        stateObservables: {
          analytics: {
            selectAnalyticsUser$: hot('u-', {
              u: { id: 'user1' },
            }),
          },
        },
        dependencies: {
          trackAnalyticsEvent: mockTrackAnalyticsEvent,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');

          flush();

          expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(
            {
              eventName: 'onboarding | new wallet | options | view',
              payload: {
                data: 'data',
              },
            },
            { user: { id: 'user1' } },
          );
        },
      }),
    );
  });
});
