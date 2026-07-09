import { distinctUntilChanged, map } from 'rxjs';

import { parseFailureId } from '../utils/parse-failure-id';

import type { SideEffect } from '../contract';

/**
 * Forwards every `addFailure` dispatch to analytics. `messageKey` is the
 * translation key — fully categorical (the same string for every user who
 * hits that failure). `blockchain` and `category` are derived from the
 * failureId convention `{blockchain}-{category}-{rest}` so dashboards can
 * segment by chain or failure type without a separate prop bag at each
 * call site. The raw failureId is not sent — it embeds opaque identifiers
 * (accountId, walletId) that fragment cardinality without analytic value.
 * `hasRetry` separates blocking-but-recoverable from passive errors.
 */
export const trackFailures: SideEffect = (
  { failures: { addFailure$ } },
  _,
  { actions },
) =>
  addFailure$.pipe(
    distinctUntilChanged((a, b) => a.payload.message === b.payload.message),
    map(({ payload }) => {
      const { blockchain, category } = parseFailureId(payload.failureId);
      return actions.analytics.trackEvent({
        eventName: 'failure | tracked',
        payload: {
          messageKey: payload.message,
          hasRetry: payload.retryAction !== undefined,
          ...(blockchain && { blockchain }),
          ...(category && { category }),
        },
      });
    }),
  );
