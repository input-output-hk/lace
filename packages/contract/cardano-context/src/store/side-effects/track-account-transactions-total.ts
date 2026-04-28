import { AccountId } from '@lace-contract/wallet-repo';
import {
  combineLatest,
  EMPTY,
  exhaustMap,
  filter,
  map,
  mergeMap,
  switchMap,
  type Observable,
} from 'rxjs';

import { CardanoRewardAccount } from '../../types';
import { groupCardanoAddressesByAccount } from '../helpers';

import type { SideEffect, Action } from '../../contract';
import type { CardanoAddressData } from '../../types';
import type { AnyAddress } from '@lace-contract/addresses';

const getRewardAccount = (
  accountAddresses: AnyAddress<CardanoAddressData>[],
) => {
  const rewardAccount = accountAddresses.find(a => !!a?.data?.rewardAccount)
    ?.data?.rewardAccount;
  return rewardAccount ? CardanoRewardAccount(rewardAccount) : undefined;
};

/**
 * Side effect that tracks total transactions per account.
 * Re-fetches on every tip change with a leading fetch on app start.
 */
export const trackAccountTransactionsTotal: SideEffect = (
  _,
  {
    addresses: { selectAllAddresses$ },
    cardanoContext: { selectChainId$, selectTip$ },
  },
  { actions, cardanoProvider: { getTotalAccountTransactionCount } },
) =>
  combineLatest([
    selectAllAddresses$,
    selectChainId$.pipe(filter(Boolean)),
  ]).pipe(
    map(([addresses, chainId]) => ({
      addressesGroupedByAccount: groupCardanoAddressesByAccount(
        addresses,
        chainId,
      ),
      chainId,
    })),
    switchMap(({ addressesGroupedByAccount, chainId }) =>
      Object.entries(addressesGroupedByAccount).map(
        ([accountIdString, accountAddresses]) => ({
          accountId: AccountId(accountIdString),
          accountAddresses,
          chainId,
        }),
      ),
    ),
    // Re-fetch on every tip change (selectTip$ uses a polling tip tracker with an immediate first poll)
    mergeMap(({ accountId, accountAddresses, chainId }) =>
      selectTip$.pipe(
        exhaustMap((): Observable<Action> => {
          const rewardAccount = getRewardAccount(accountAddresses);
          if (!rewardAccount) return EMPTY;
          return getTotalAccountTransactionCount(
            { rewardAccount },
            { chainId },
          ).pipe(
            map(result =>
              result.mapOrElse<Action>(
                error =>
                  actions.cardanoContext.getAccountTransactionsTotalFailed({
                    accountId,
                    chainId,
                    failure: error.reason,
                  }),
                total =>
                  actions.cardanoContext.setAccountTransactionsTotal({
                    accountId,
                    total,
                  }),
              ),
            ),
          );
        }),
      ),
    ),
  );
