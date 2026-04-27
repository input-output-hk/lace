import { isNotNil } from '@cardano-sdk/util';
import { toEmpty, blockingWithLatestFrom } from '@cardano-sdk/util-rxjs';
import { mergeMap, filter, catchError, EMPTY, take, skipWhile } from 'rxjs';
import { v4 } from 'uuid';

import type { SideEffect } from '../contract';
import type { AnyLaceSideEffect } from '@lace-contract/module';

export const generateUserId: SideEffect = (
  _,
  { analytics: { selectAnalyticsUser$ } },
  { actions },
) => {
  return selectAnalyticsUser$.pipe(
    take(1),
    skipWhile(Boolean),
    mergeMap(() => [
      actions.analytics.load({
        id: v4(),
      }),
    ]),
  );
};

export const trackAnalyticsEvents: SideEffect = (
  { analytics: { trackEvent$ } },
  { analytics: { selectAnalyticsUser$ } },
  { logger, trackAnalyticsEvent },
) =>
  trackEvent$.pipe(
    // this will queue all events in-memory
    // until user accepts or rejects analytics
    blockingWithLatestFrom(selectAnalyticsUser$.pipe(filter(isNotNil))),
    mergeMap(([{ payload }, user]) => trackAnalyticsEvent(payload, { user })),
    toEmpty,
    catchError(error => {
      logger.error('Failed to track analytics event', error);
      return EMPTY;
    }),
  );

export const analyticsSideEffects: AnyLaceSideEffect[] = [
  generateUserId,
  trackAnalyticsEvents,
];
