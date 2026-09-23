import { isNotNil } from '@cardano-sdk/util';
import { toEmpty, blockingWithLatestFrom } from '@cardano-sdk/util-rxjs';
import {
  mergeMap,
  filter,
  catchError,
  combineLatest,
  EMPTY,
  map,
  take,
  skipWhile,
  startWith,
  switchMap,
} from 'rxjs';
import { v4 } from 'uuid';

import type { AnalyticsUser } from './slice';
import type { SideEffect } from '../contract';
import type { AnyLaceSideEffect } from '@lace-contract/module';

export const generateUserId: SideEffect = (
  _,
  { analytics: { selectAnalyticsUser$, selectIsAnalyticsPermitted$ } },
  { actions },
) => {
  return selectIsAnalyticsPermitted$.pipe(
    // Without ANALYTICS_CONSENT_REQUIRED this is `true` on the first frame, so
    // the id is still minted at boot. switchMap rather than a one-shot gate so
    // a re-grant after a revoke mints a fresh id instead of leaving the wallet
    // permanently unidentified.
    switchMap(isPermitted =>
      isPermitted
        ? selectAnalyticsUser$.pipe(take(1), skipWhile(Boolean))
        : EMPTY,
    ),
    mergeMap(() => [
      actions.analytics.load({
        id: v4(),
      }),
    ]),
  );
};

/**
 * Drops a stored id that consent does not cover.
 *
 * The slice is persisted, so an install that minted an id under a build without
 * ANALYTICS_CONSENT_REQUIRED carries it into one that has the flag. Keeping it
 * would report the eventual opt-in under the very id that identified everything
 * gathered before anyone was asked — the re-link `revokeConsent` exists to
 * prevent. Holding rather than discarding has the same defect, one grant later.
 *
 * No-op for every app without the flag: permission is `true` there on the first
 * frame.
 */
export const discardUnconsentedUserId: SideEffect = (
  _,
  { analytics: { selectAnalyticsUser$, selectIsAnalyticsPermitted$ } },
  { actions },
) =>
  selectIsAnalyticsPermitted$.pipe(
    switchMap(isPermitted =>
      isPermitted ? EMPTY : selectAnalyticsUser$.pipe(filter(isNotNil)),
    ),
    map(() => actions.analytics.discardUser()),
  );

export const trackAnalyticsEvents: SideEffect = (
  { analytics: { revokeConsent$, trackEvent$ } },
  { analytics: { selectAnalyticsUser$, selectIsAnalyticsPermitted$ } },
  { logger, trackAnalyticsEvent },
) =>
  revokeConsent$.pipe(
    startWith(undefined),
    // Resubscribing rebuilds the queue below, which is what discards events
    // raised before the opt-out: the gate only ever opens, so without this a
    // later opt-in would flush them under the freshly minted id. Safe because
    // redux-observable emits the action after the reducer has cleared the user.
    switchMap(() =>
      trackEvent$.pipe(
        // this will queue all events in-memory
        // until user accepts or rejects analytics
        // Permission, not merely `isNotNil(user)`: an id is a fact about
        // storage, and consent is the question this gate is meant to ask. A
        // persisted id that predates the flag would otherwise open it.
        blockingWithLatestFrom(
          combineLatest([
            selectAnalyticsUser$,
            selectIsAnalyticsPermitted$,
          ]).pipe(
            filter(
              (pair): pair is [AnalyticsUser, boolean] =>
                isNotNil(pair[0]) && pair[1],
            ),
            map(([user]) => user),
          ),
        ),
        mergeMap(([{ payload }, user]) =>
          trackAnalyticsEvent(payload, { user }),
        ),
      ),
    ),
    toEmpty,
    catchError(error => {
      logger.error('Failed to track analytics event', error);
      return EMPTY;
    }),
  );

export const analyticsSideEffects: AnyLaceSideEffect[] = [
  generateUserId,
  discardUnconsentedUserId,
  trackAnalyticsEvents,
];
