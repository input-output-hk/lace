import { testSideEffect } from '@lace-lib/util-dev';
import { NEVER, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { analyticsActions as actions } from '../../src';
import {
  discardUnconsentedUserId,
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

const anEvent = actions.analytics.trackEvent({
  eventName: 'onboarding | new wallet | options | view',
  payload: { data: 'data' },
});

describe('Analytics Side Effects', () => {
  let mockTrackAnalyticsEvent: MockTrackAnalyticsEvent;

  beforeEach(() => {
    mockTrackAnalyticsEvent = vi.fn<TrackAnalyticsEventFunction>(() =>
      of(undefined),
    );
  });

  describe('generateUserId', () => {
    it('should generate user id', () => {
      testSideEffect(generateUserId, ({ hot, expectObservable }) => ({
        stateObservables: {
          analytics: {
            selectAnalyticsUser$: hot('ab', {
              a: undefined,
              b: { id: 'test-uuid' },
            }),
            selectIsAnalyticsPermitted$: of(true),
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

    it('should not generate a user id while analytics are not permitted', () => {
      testSideEffect(generateUserId, ({ hot, expectObservable }) => ({
        stateObservables: {
          analytics: {
            selectAnalyticsUser$: hot('a', { a: undefined }),
            selectIsAnalyticsPermitted$: of(false),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('|');
        },
      }));
    });

    it('should mint a fresh user id when consent is granted again after a revoke', () => {
      testSideEffect(generateUserId, ({ cold, hot, expectObservable }) => ({
        stateObservables: {
          analytics: {
            // cold, so each re-grant re-reads the (cleared) user id.
            selectAnalyticsUser$: cold('u', { u: undefined }),
            selectIsAnalyticsPermitted$: hot('t-f-t', {
              f: false,
              t: true,
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a---a', {
            a: actions.analytics.load({ id: 'test-uuid' }),
          });
        },
      }));
    });
  });

  describe('trackAnalyticsEvents', () => {
    it('should track analytics events', () => {
      testSideEffect(
        trackAnalyticsEvents,
        ({ flush, hot, expectObservable }) => ({
          actionObservables: {
            analytics: {
              revokeConsent$: NEVER,
              trackEvent$: hot('-a-', { a: anEvent }),
            },
          },
          stateObservables: {
            analytics: {
              selectAnalyticsUser$: hot('u-', {
                u: { id: 'user1' },
              }),
              selectIsAnalyticsPermitted$: of(true),
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

    it('should flush events queued before a user id exists', () => {
      testSideEffect(
        trackAnalyticsEvents,
        ({ flush, hot, expectObservable }) => ({
          actionObservables: {
            analytics: {
              revokeConsent$: NEVER,
              trackEvent$: hot('a', { a: anEvent }),
            },
          },
          stateObservables: {
            analytics: {
              selectAnalyticsUser$: hot('u-i', {
                i: { id: 'user2' },
                u: undefined,
              }),
              selectIsAnalyticsPermitted$: of(true),
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
              expect.anything(),
              { user: { id: 'user2' } },
            );
          },
        }),
      );
    });

    it('should drop events queued before an opt-out rather than report them under the next id', () => {
      testSideEffect(
        trackAnalyticsEvents,
        ({ flush, hot, expectObservable }) => ({
          actionObservables: {
            analytics: {
              revokeConsent$: hot('-r', {
                r: actions.analytics.revokeConsent(),
              }),
              trackEvent$: hot('a', { a: anEvent }),
            },
          },
          stateObservables: {
            analytics: {
              selectAnalyticsUser$: hot('u-i', {
                i: { id: 'user2' },
                u: undefined,
              }),
              selectIsAnalyticsPermitted$: of(true),
            },
          },
          dependencies: {
            trackAnalyticsEvent: mockTrackAnalyticsEvent,
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');

            flush();

            expect(mockTrackAnalyticsEvent).not.toHaveBeenCalled();
          },
        }),
      );
    });

    it('should hold events while a persisted id exists but consent does not', () => {
      testSideEffect(
        trackAnalyticsEvents,
        ({ flush, hot, expectObservable }) => ({
          actionObservables: {
            analytics: {
              revokeConsent$: NEVER,
              trackEvent$: hot('a', { a: anEvent }),
            },
          },
          stateObservables: {
            analytics: {
              selectAnalyticsUser$: hot('u', { u: { id: 'persisted' } }),
              selectIsAnalyticsPermitted$: of(false),
            },
          },
          dependencies: {
            trackAnalyticsEvent: mockTrackAnalyticsEvent,
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');

            flush();

            expect(mockTrackAnalyticsEvent).not.toHaveBeenCalled();
          },
        }),
      );
    });

    it('should report the held events under the persisted id once consent arrives', () => {
      testSideEffect(
        trackAnalyticsEvents,
        ({ flush, hot, expectObservable }) => ({
          actionObservables: {
            analytics: {
              revokeConsent$: NEVER,
              trackEvent$: hot('a', { a: anEvent }),
            },
          },
          stateObservables: {
            analytics: {
              selectAnalyticsUser$: hot('u', { u: { id: 'user3' } }),
              selectIsAnalyticsPermitted$: hot('f-t', {
                f: false,
                t: true,
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
              expect.anything(),
              { user: { id: 'user3' } },
            );
          },
        }),
      );
    });
  });

  describe('discardUnconsentedUserId', () => {
    it('should discard an id persisted from before the consent question', () => {
      testSideEffect(discardUnconsentedUserId, ({ hot, expectObservable }) => ({
        stateObservables: {
          analytics: {
            selectAnalyticsUser$: hot('u', { u: { id: 'persisted' } }),
            selectIsAnalyticsPermitted$: of(false),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.analytics.discardUser(),
          });
        },
      }));
    });

    it('should leave the id alone in an app that does not require consent', () => {
      testSideEffect(discardUnconsentedUserId, ({ hot, expectObservable }) => ({
        stateObservables: {
          analytics: {
            selectAnalyticsUser$: hot('u', { u: { id: 'persisted' } }),
            selectIsAnalyticsPermitted$: of(true),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('|');
        },
      }));
    });

    it('should stay quiet when there is no id to discard', () => {
      testSideEffect(discardUnconsentedUserId, ({ hot, expectObservable }) => ({
        stateObservables: {
          analytics: {
            selectAnalyticsUser$: hot('u', { u: undefined }),
            selectIsAnalyticsPermitted$: of(false),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
        },
      }));
    });
  });
});
