import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import isEqual from 'lodash/isEqual';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  filter,
  from,
  map,
  merge as rxMerge,
  mergeMap,
  of,
  switchMap,
  toArray,
  startWith,
  takeUntil,
} from 'rxjs';

import { CardanoRewardAccount } from '../../types';
import { mapToRecord, isCardanoAccount } from '../../util';
import { CardanoRewardsHistoryFailureId } from '../../value-objects';
import { groupCardanoAddressesByAccount } from '../helpers';

import { retryAfterWalletResetFailure } from './retry-after-wallet-reset-failure';

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
    actionObservables,
    {
      addresses: { selectAllAddresses$ },
      wallets: { selectActiveNetworkAccounts$ },
      cardanoContext: { selectChainId$ },
      failures: { selectFailureById$ },
    },
    { actions, cardanoProvider: { getAccountRewards } },
  ) =>
    selectActiveNetworkAccounts$.pipe(
      switchMap(accounts =>
        rxMerge(
          ...accounts.filter(isCardanoAccount).map(account =>
            combineLatest([
              selectAllAddresses$.pipe(
                map(addresses =>
                  addresses.filter(a => a.accountId === account.accountId),
                ),
              ),
              selectChainId$.pipe(filter(Boolean)),
            ]).pipe(
              distinctUntilChanged((previous, current) =>
                isEqual(previous, current),
              ),
              debounceTime(debounceTimeout),
              switchMap(([addresses, chainId]) => {
                const addressesGroupedByAccount =
                  groupCardanoAddressesByAccount(addresses, chainId);

                return from(Object.values(addressesGroupedByAccount)).pipe(
                  mergeMap(accountAddresses => {
                    const { accountId, rewardAccounts } =
                      extractDistinctRewardAccounts(accountAddresses);
                    if (!accountId || rewardAccounts.length === 0) return EMPTY;

                    const failureId = CardanoRewardsHistoryFailureId(accountId);

                    return rxMerge(
                      retryAfterWalletResetFailure(
                        accountId,
                        actionObservables,
                      ),
                      actionObservables.cardanoContext.resetWalletSyncState$.pipe(
                        filter(
                          action => action.payload.accountId === accountId,
                        ),
                      ),
                      actionObservables.sync.clearPendingSyncsForAccounts$.pipe(
                        filter(a => a.payload.accountIds.includes(accountId)),
                      ),
                    ).pipe(
                      startWith(null),
                      switchMap(() =>
                        from(rewardAccounts).pipe(
                          mergeMap(rewardAccount =>
                            getAccountRewards(
                              { rewardAccount },
                              { chainId },
                            ).pipe(
                              map(result => {
                                if (result.isErr()) throw result.unwrapErr();
                                return {
                                  rewardAccount,
                                  value: result.unwrap(),
                                };
                              }),
                              retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
                            ),
                          ),
                          toArray(),
                          mergeMap(results => {
                            const rewardsMap = new Map<
                              CardanoRewardAccount,
                              Reward[]
                            >();
                            for (const { rewardAccount, value } of results) {
                              rewardsMap.set(rewardAccount, value);
                            }
                            return rxMerge(
                              of(
                                actions.cardanoContext.setAccountRewardsHistory(
                                  {
                                    accountId,
                                    rewardsHistory: mapToRecord(rewardsMap),
                                  },
                                ),
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
                          takeUntil(
                            actionObservables.cardanoContext.setWalletSyncResetResult$.pipe(
                              filter(
                                a =>
                                  a.payload.accountId === accountId &&
                                  a.payload.status === 'Failed',
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                );
              }),
            ),
          ),
        ),
      ),
    );
