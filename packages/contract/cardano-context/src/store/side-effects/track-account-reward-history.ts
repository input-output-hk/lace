import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
  combineLatest,
  debounceTime,
  EMPTY,
  filter,
  from,
  map,
  merge as rxMerge,
  mergeMap,
  of,
  switchMap,
  toArray,
} from 'rxjs';

import { CardanoRewardAccount } from '../../types';
import { mapToRecord } from '../../util';
import { CardanoRewardsHistoryFailureId } from '../../value-objects';
import { groupCardanoAddressesByAccount } from '../helpers';

import type { SideEffect } from '../../contract';
import type { CardanoAddressData, Reward } from '../../types';
import type { AnyAddress } from '@lace-contract/addresses';
import type { TranslationKey } from '@lace-contract/i18n';

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
 *
 * Transient provider errors are retried per-call with exponential backoff.
 * After exhaustion a failure keyed by `CardanoRewardsHistoryFailureId(accountId)`
 * is surfaced; the next address/chainId change naturally re-triggers the fetch
 * and a successful result auto-dismisses the failure.
 */
export const createTrackAccountRewardsHistory =
  (debounceTimeout: number): SideEffect =>
  (
    _,
    {
      addresses: { selectAllAddresses$ },
      cardanoContext: { selectChainId$ },
      failures: { selectFailureById$ },
    },
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
            if (!accountId || rewardAccounts.length === 0) return EMPTY;

            const failureId = CardanoRewardsHistoryFailureId(accountId);

            return from(rewardAccounts).pipe(
              mergeMap(rewardAccount =>
                getAccountRewards({ rewardAccount }, { chainId }).pipe(
                  map(result => {
                    if (result.isErr()) throw result.unwrapErr();
                    return { rewardAccount, value: result.unwrap() };
                  }),
                  retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
                ),
              ),
              toArray(),
              mergeMap(results => {
                const rewardsMap = new Map<CardanoRewardAccount, Reward[]>();
                for (const { rewardAccount, value } of results) {
                  rewardsMap.set(rewardAccount, value);
                }
                return rxMerge(
                  of(
                    actions.cardanoContext.setAccountRewardsHistory({
                      accountId,
                      rewardsHistory: mapToRecord(rewardsMap),
                    }),
                  ),
                  of(failureId).pipe(
                    autoDismissFailureOnSuccess(selectFailureById$),
                  ),
                );
              }),
              catchError(() =>
                of(
                  actions.failures.addFailure({
                    failureId,
                    message:
                      'sync.error.cardano-rewards-history-failed' as TranslationKey,
                  }),
                ),
              ),
            );
          }),
        );
      }),
    );
