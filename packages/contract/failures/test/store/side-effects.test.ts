import '../../src/augmentations';

import { analyticsActions } from '@lace-contract/analytics';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { trackFailures } from '../../src/store/side-effects';
import { failuresActions } from '../../src/store/slice';
import { FailureId } from '../../src/value-objects';

import type { TranslationKey } from '@lace-contract/i18n';

const actions = {
  ...failuresActions,
  ...analyticsActions,
};

describe('trackFailures', () => {
  it('emits failure | tracked enriched with blockchain, category, and hasRetry when the failure id follows the convention', () => {
    testSideEffect(trackFailures, ({ hot, expectObservable }) => ({
      actionObservables: {
        failures: {
          addFailure$: hot('-a-', {
            a: actions.failures.addFailure({
              failureId: FailureId('cardano-sync-account-0-mainnet'),
              message: 'sync.error.cardano-sync-round-failed' as TranslationKey,
              retryAction: { type: 'cardanoContext/retrySyncRound' },
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a-', {
          a: actions.analytics.trackEvent({
            eventName: 'failure | tracked',
            payload: {
              messageKey: 'sync.error.cardano-sync-round-failed',
              hasRetry: true,
              blockchain: 'Cardano',
              category: 'sync',
            },
          }),
        });
      },
    }));
  });

  it('suppresses consecutive duplicate failures with the same messageKey', () => {
    testSideEffect(trackFailures, ({ hot, expectObservable }) => ({
      actionObservables: {
        failures: {
          addFailure$: hot('-a-a-b-a', {
            a: actions.failures.addFailure({
              failureId: FailureId('cardano-sync-account-0-mainnet'),
              message: 'sync.error.cardano-sync-round-failed' as TranslationKey,
            }),
            b: actions.failures.addFailure({
              failureId: FailureId('cardano-wallet-wallet123'),
              message: 'wallet.error' as TranslationKey,
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        // a-a-b-a: second 'a' is suppressed (consecutive duplicate);
        // 'b' breaks the run so the final 'a' is emitted again.
        expectObservable(sideEffect$).toBe('-a---b-a', {
          a: actions.analytics.trackEvent({
            eventName: 'failure | tracked',
            payload: {
              messageKey: 'sync.error.cardano-sync-round-failed',
              hasRetry: false,
              blockchain: 'Cardano',
              category: 'sync',
            },
          }),
          b: actions.analytics.trackEvent({
            eventName: 'failure | tracked',
            payload: {
              messageKey: 'wallet.error',
              hasRetry: false,
              blockchain: 'Cardano',
              category: 'wallet',
            },
          }),
        });
      },
    }));
  });

  it('omits blockchain and category when the failure id does not follow the convention, and reports hasRetry=false when no retry action is provided', () => {
    testSideEffect(trackFailures, ({ hot, expectObservable }) => ({
      actionObservables: {
        failures: {
          addFailure$: hot('-a-', {
            a: actions.failures.addFailure({
              failureId: FailureId('non-conforming-id'),
              message: 'unknown.error' as TranslationKey,
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a-', {
          a: actions.analytics.trackEvent({
            eventName: 'failure | tracked',
            payload: {
              messageKey: 'unknown.error',
              hasRetry: false,
            },
          }),
        });
      },
    }));
  });
});
