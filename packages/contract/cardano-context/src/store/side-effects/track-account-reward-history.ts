import {
  combineLatest,
  debounceTime,
  EMPTY,
  filter,
  from,
  map,
  mergeMap,
  switchMap,
  toArray,
} from 'rxjs';

import { CardanoRewardAccount } from '../../types';
import { mapToRecord } from '../../util';
import { groupCardanoAddressesByAccount } from '../helpers';

import type { SideEffect } from '../../contract';
import type { CardanoAddressData, Reward } from '../../types';
import type { AnyAddress } from '@lace-contract/addresses';

const extractDistinctRewardAccounts = (
  accountAddresses: AnyAddress<CardanoAddressData>[],
) => {
  const accountId = accountAddresses[0]?.accountId;
  const rewardAccounts = Array.from(
    new Set(
      accountAddresses
        .filter(a => !!a?.data?.rewardAccount)
        .map(a => CardanoRewardAccount(a.data!.rewardAccount)),
    ),
  );
  return { accountId, rewardAccounts };
};

/**
 * Side effect that tracks account rewards history by grouping Cardano
 * addresses by account and fetching rewards for each account's reward accounts.
 */
export const createTrackAccountRewardsHistory =
  (debounceTimeout: number): SideEffect =>
  (
    _,
    { addresses: { selectAllAddresses$ }, cardanoContext: { selectChainId$ } },
    { actions, cardanoProvider: { getAccountRewards } },
  ) =>
    combineLatest([
      selectAllAddresses$,
      selectChainId$.pipe(filter(Boolean)),
    ]).pipe(
      debounceTime(debounceTimeout),
      switchMap(([addresses, chainId]) => {
        const addressesGroupedByAccount = groupCardanoAddressesByAccount(
          addresses,
          chainId,
        );

        return from(Object.values(addressesGroupedByAccount)).pipe(
          mergeMap(accountAddresses => {
            const { accountId, rewardAccounts } =
              extractDistinctRewardAccounts(accountAddresses);
            if (rewardAccounts.length === 0) return EMPTY;

            return from(rewardAccounts).pipe(
              mergeMap(rewardAccount =>
                getAccountRewards({ rewardAccount }, { chainId }).pipe(
                  map(result => ({ rewardAccount, result })),
                ),
              ),
              toArray(),
              map(results => {
                const rewardsMap = new Map<CardanoRewardAccount, Reward[]>();
                const errors = [];

                for (const { rewardAccount, result } of results) {
                  if (result.isOk()) {
                    rewardsMap.set(rewardAccount, result.value);
                  } else {
                    errors.push({ rewardAccount, error: result.error });
                  }
                }

                if (errors.length) {
                  return actions.cardanoContext.getAccountRewardsHistoryFailed({
                    accountId,
                    failure: errors[0].error.reason,
                  });
                }

                const rewardsHistoryRecord = mapToRecord(rewardsMap);
                return actions.cardanoContext.setAccountRewardsHistory({
                  accountId,
                  rewardsHistory: rewardsHistoryRecord,
                });
              }),
            );
          }),
        );
      }),
    );
