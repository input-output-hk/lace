import { mergeMap } from 'rxjs';

import type { SideEffect } from '../../contract';

/** Notify once in the store, independently of extension view mounts. */
export const resetWalletSyncToast: SideEffect = (
  { cardanoContext: { setWalletSyncResetResult$ } },
  _,
  { actions },
) =>
  setWalletSyncResetResult$.pipe(
    mergeMap(({ payload: { status, error } }) => [
      actions.ui.showToast({
        text:
          status === 'Completed'
            ? 'v2.account-settings.hd-wallet-sync.toast.success'
            : error ?? 'v2.account-settings.hd-wallet-sync.toast.error',
        color: status === 'Completed' ? 'positive' : 'negative',
        leftIcon: { name: status === 'Completed' ? 'Refresh' : 'Warning' },
      }),
      ...(status === 'Completed'
        ? [
            actions.analytics.trackEvent({
              eventName: 'settings | wallet | hd wallet sync | sync | success',
            }),
          ]
        : []),
    ]),
  );
