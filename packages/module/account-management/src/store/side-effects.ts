import { filter, map, pairwise, withLatestFrom } from 'rxjs';

import type { SideEffect } from '..';
import type { ActiveAccountContext } from '@lace-contract/wallet-repo';

const trackAccountAdded: SideEffect = (
  { accountManagement: { accountAdded$ } },
  _,
  { actions },
) =>
  accountAdded$.pipe(
    map(({ payload }) =>
      actions.analytics.trackEvent({
        eventName: 'account management | account | added',
        payload: {
          blockchain: payload.blockchain,
          walletType: payload.walletType,
          accountIndex: payload.accountIndex,
        },
      }),
    ),
  );

type SetActiveAccountContext = NonNullable<ActiveAccountContext>;

/**
 * Tracks active account switches as the user moves between accounts within a
 * session — via the portfolio carousel, token-detail navigation, or follow-on
 * effects from a network switch. Skips initial assignment (null → set) and
 * teardown (set → null), and ignores no-op re-emissions where accountId is
 * unchanged. Identifiers are not sent; only categorical fields (blockchain,
 * walletType, networkType) and a same-wallet boolean.
 */
const trackAccountSwitched: SideEffect = (
  _,
  { wallets: { selectActiveAccountContext$, selectAll$ } },
  { actions },
) =>
  selectActiveAccountContext$.pipe(
    pairwise(),
    filter(
      (pair): pair is [SetActiveAccountContext, SetActiveAccountContext] => {
        const [previous, current] = pair;
        return (
          previous !== null &&
          current !== null &&
          previous.accountId !== current.accountId
        );
      },
    ),
    withLatestFrom(selectAll$),
    map(([[previous, current], wallets]) => {
      const previousWallet = wallets.find(
        w => w.walletId === previous.walletId,
      );
      const currentWallet = wallets.find(w => w.walletId === current.walletId);
      const previousAccount = previousWallet?.accounts.find(
        a => a.accountId === previous.accountId,
      );
      const currentAccount = currentWallet?.accounts.find(
        a => a.accountId === current.accountId,
      );

      return actions.analytics.trackEvent({
        eventName: 'account | switched',
        payload: {
          ...(previousAccount && {
            fromBlockchain: previousAccount.blockchainName,
            fromNetworkType: previousAccount.networkType,
          }),
          ...(currentAccount && {
            toBlockchain: currentAccount.blockchainName,
            toNetworkType: currentAccount.networkType,
          }),
          ...(previousWallet && { fromWalletType: previousWallet.type }),
          ...(currentWallet && { toWalletType: currentWallet.type }),
          isSameWallet: previous.walletId === current.walletId,
        },
      });
    }),
  );

export const sideEffects: SideEffect[] = [
  trackAccountAdded,
  trackAccountSwitched,
];
