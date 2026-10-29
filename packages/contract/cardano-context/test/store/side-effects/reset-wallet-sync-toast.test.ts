import { analyticsActions } from '@lace-contract/analytics';
import { uiActions } from '@lace-contract/app';
import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { describe, it } from 'vitest';

import { cardanoContextActions } from '../../../src/store';
import { resetWalletSyncToast } from '../../../src/store/side-effects/reset-wallet-sync-toast';

import type { TranslationKey } from '@lace-contract/i18n';

const actions = { ...cardanoContextActions, ...analyticsActions, ...uiActions };

describe('resetWalletSyncToast', () => {
  it.each<TranslationKey | undefined>([
    undefined,
    'v2.account-settings.hd-wallet-sync.timeout',
    'sync.error.token-metadata-fetch-failed',
  ])(
    'notifies immediately with failure reason %s, and tracks only successful resets',
    error => {
      testSideEffect(resetWalletSyncToast, ({ hot, expectObservable }) => ({
        actionObservables: {
          cardanoContext: {
            setWalletSyncResetResult$: hot('a----b----a', {
              a: actions.cardanoContext.setWalletSyncResetResult({
                accountId: AccountId('one'),
                status: 'Completed',
              }),
              b: actions.cardanoContext.setWalletSyncResetResult({
                accountId: AccountId('two'),
                status: 'Failed',
                error,
              }),
            }),
          },
        },
        dependencies: { actions },
        assertion: source => {
          expectObservable(source).toBe('(st)-f----(st)', {
            s: actions.ui.showToast({
              text: 'v2.account-settings.hd-wallet-sync.toast.success',
              color: 'positive',
              leftIcon: { name: 'Refresh' },
            }),
            t: actions.analytics.trackEvent({
              eventName: 'settings | wallet | hd wallet sync | sync | success',
            }),
            f: actions.ui.showToast({
              text: error ?? 'v2.account-settings.hd-wallet-sync.toast.error',
              color: 'negative',
              leftIcon: { name: 'Warning' },
            }),
          });
        },
      }));
    },
  );
});
