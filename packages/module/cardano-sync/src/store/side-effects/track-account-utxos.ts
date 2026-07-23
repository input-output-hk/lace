import {
  CardanoUtxoFetchFailureId,
  extractUniqueStakeKeys,
  getTopOnChainActivity,
  groupCardanoAddressesByAccount,
  isCardanoAccount,
  UTXO_SYNC_CONFIRMATION_DEPTH,
  UtxoCacheKey,
} from '@lace-contract/cardano-context';
import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  forkJoin,
  map,
  merge as rxMerge,
  mergeMap,
  of,
  switchMap,
  withLatestFrom,
} from 'rxjs';

import {
  extractOwnedPaymentCredentials,
  filterFrankenUtxos,
} from '../helpers/filter-franken-utxos';

import type { CardanoSyncAction, SideEffect } from '../..';
import type { Cardano } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  CardanoAddressData,
  CardanoRewardAccount as CardanoRewardAccountType,
  TopOnChainActivity,
} from '@lace-contract/cardano-context';
import type { TranslationKey } from '@lace-contract/i18n';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

type FetchParams = {
  accountAddresses: AnyAddress<CardanoAddressData>[];
  stakeKeys: CardanoRewardAccountType[];
  cacheKey: UtxoCacheKey;
  topActivity: TopOnChainActivity | undefined;
  tip: Cardano.Tip | undefined;
};

/**
 * Sentinel `topOnChainActivityId` for the cache key when an account has no
 * on-chain (non-Rewards, non-Pending) activity loaded yet. Real activity ids
 * are tx hashes, so it cannot collide. See the `trackAccountUtxos` JSDoc for
 * the bootstrap behaviour. Duplicated (not exported — test-only exports are
 * forbidden) in `test/store/side-effects/track-account-utxos.test.ts` as
 * `cacheKeyNoActivity`; keep the literals in sync.
 */
const NO_ACTIVITY_CACHE_KEY_SENTINEL = 'no-activity';

const utxoKey = (utxo: Cardano.Utxo): string =>
  `${utxo[0].txId}#${utxo[0].index}`;

/** Order-insensitive equality by outpoint (`txId#index`). */
const utxoSetsEqual = (a: Cardano.Utxo[], b: Cardano.Utxo[]): boolean => {
  if (a.length !== b.length) return false;
  const aKeys = new Set(a.map(utxoKey));
  for (const utxo of b) if (!aKeys.has(utxoKey(utxo))) return false;
  return true;
};

const isTipBeyondConfirmationDepth = (
  topActivity: TopOnChainActivity | undefined,
  tip: Cardano.Tip | undefined,
): boolean => {
  if (!tip) return false;
  // No anchoring activity at all (first fetch before any transaction is
  // loaded), or an activity persisted before the slot field was introduced:
  // there is nothing to wait on, so treat as already settled to avoid an
  // unbounded refetch loop when fetched UTxOs match stored ones.
  if (topActivity?.slot === undefined) return true;
  return tip.slot - topActivity.slot >= UTXO_SYNC_CONFIRMATION_DEPTH;
};

/**
 * Refetches UTxOs per account.
 *
 * Natural trigger:
 * - Combines activities + addresses + tip per account. Top non-Rewards,
 *   non-Pending activityId and sorted stake-key set form a cache key. Fetch
 *   runs only when the cache key differs from the persisted one, so healthy
 *   (already-settled) accounts skip the fetch entirely. Tip is part of the
 *   `distinctUntilChanged` comparator so each tip update can drive a refetch
 *   while the persisted cacheKey is still behind — once the cacheKey is
 *   advanced (see below) subsequent tip ticks no-op at the cacheKey gate.
 * - Bootstrap (no on-chain activity yet): the fetch is NOT gated on a
 *   `topActivity`. As soon as addresses + stake keys are known the fetch runs
 *   with `NO_ACTIVITY_CACHE_KEY_SENTINEL` as the activity component of the
 *   cache key. Balances are independent of the activity feed; gating on
 *   `topActivity` previously meant an account whose first activities page is
 *   entirely Rewards (more recent rewards than its newest tx) never fetched
 *   UTxOs until enough transactions were paged in. When a real `topActivity`
 *   later materialises the cache key flips to the activity-id-based key,
 *   triggering one refetch, after which the steady-state logic applies.
 * - Account/wallet removal cannot regress a real cache key to the sentinel:
 *   `wallets.removeAccount`/`removeWallet` is a single dispatch whose
 *   extraReducers delete the account's activities, addresses, and
 *   `accountUtxos` entry (which holds the persisted cacheKey) in the same
 *   reducer pass that drops the account from `selectActiveNetworkAccounts$`,
 *   so this stream is torn down with no intermediate active-account /
 *   empty-activities state. Worst case is a same-tick glitch emission
 *   (selector observables notify in subscription order) whose fetch is
 *   unsubscribed within the same synchronous notification pass — no state
 *   writes can result.
 *
 * Cache key advancement (per fetch):
 * - The UTxOs are dispatched on every successful fetch.
 * - The persisted cacheKey is advanced (via `setLastFetchedUtxoCacheKey`)
 *   only when either the just-fetched UTxO set differs from what we had
 *   stored, or the tip is at least `UTXO_SYNC_CONFIRMATION_DEPTH` slots
 *   beyond the anchoring activity's slot. While neither holds, the cacheKey
 *   stays behind and the natural trigger keeps re-fetching as the tip
 *   advances — this is what unblocks the indexer-lag stall.
 *
 * Manual retry trigger:
 * - On `retrySyncRound` dispatches, refetches only accounts that currently
 *   hold a `CardanoUtxoFetchFailureId` in the failures store, bypassing the
 *   cache-key gate and unconditionally advancing the persisted cacheKey on
 *   success.
 *
 * Transient provider errors are retried with exponential backoff. After
 * exhaustion a failure keyed by `CardanoUtxoFetchFailureId(accountId)` is
 * surfaced; a subsequent successful fetch auto-dismisses it.
 */
export const trackAccountUtxos: SideEffect = (
  { cardanoContext: { retrySyncRound$ } },
  {
    wallets: { selectActiveNetworkAccounts$ },
    addresses: { selectAllAddresses$ },
    activities: { selectAllMap$ },
    cardanoContext: {
      selectLastFetchedUtxoCacheKeyByAccount$,
      selectAccountUtxos$,
      selectTip$,
    },
    failures: { selectFailureById$, selectAllFailures$ },
  },
  { actions, cardanoProvider: { getAccountUtxos }, logger },
) =>
  selectActiveNetworkAccounts$.pipe(
    map(accounts => accounts.filter(isCardanoAccount)),
    switchMap(accounts =>
      rxMerge(
        ...accounts.map(account => {
          const { accountId } = account;
          const { chainId } = account.blockchainSpecific;

          const computeAccountAddresses = (
            allAddresses: Parameters<typeof groupCardanoAddressesByAccount>[0],
          ) =>
            groupCardanoAddressesByAccount(allAddresses, chainId)[accountId] ??
            [];

          const naturalTrigger$: Observable<FetchParams> = combineLatest([
            selectAllMap$.pipe(
              map(activitiesByAccount =>
                getTopOnChainActivity(activitiesByAccount, accountId),
              ),
            ),
            selectAllAddresses$,
            selectTip$,
          ]).pipe(
            map(([topActivity, allAddresses, tip]) => {
              const accountAddresses = computeAccountAddresses(allAddresses);
              const stakeKeys = extractUniqueStakeKeys(accountAddresses);
              return { topActivity, accountAddresses, stakeKeys, tip };
            }),
            // Not gated on `topActivity` — fetch once addresses + stake keys
            // exist (see the bootstrap note in the JSDoc above).
            filter(p => p.stakeKeys.length > 0),
            map(({ accountAddresses, stakeKeys, topActivity, tip }) => ({
              accountAddresses,
              stakeKeys,
              topActivity,
              tip,
              cacheKey: UtxoCacheKey({
                topOnChainActivityId:
                  topActivity?.activityId ?? NO_ACTIVITY_CACHE_KEY_SENTINEL,
                stakeKeys,
                accountAddressCount: accountAddresses.length,
              }),
            })),
            distinctUntilChanged(
              (a, b) =>
                a.cacheKey === b.cacheKey && a.tip?.slot === b.tip?.slot,
            ),
            withLatestFrom(selectLastFetchedUtxoCacheKeyByAccount$),
            filter(
              ([{ cacheKey }, persisted]) => cacheKey !== persisted[accountId],
            ),
            map(([params]) => params),
          );

          const retryTrigger$: Observable<FetchParams> = retrySyncRound$.pipe(
            withLatestFrom(
              selectAllFailures$,
              selectAllMap$,
              selectAllAddresses$,
              selectTip$,
            ),
            filter(
              ([, allFailures]) =>
                CardanoUtxoFetchFailureId(accountId) in allFailures,
            ),
            map(
              ([, , activitiesByAccount, allAddresses, tip]):
                | FetchParams
                | undefined => {
                const topActivity = getTopOnChainActivity(
                  activitiesByAccount,
                  accountId,
                );
                const accountAddresses = computeAccountAddresses(allAddresses);
                const stakeKeys = extractUniqueStakeKeys(accountAddresses);
                if (stakeKeys.length === 0) return undefined;
                return {
                  accountAddresses,
                  stakeKeys,
                  topActivity,
                  tip,
                  cacheKey: UtxoCacheKey({
                    topOnChainActivityId:
                      topActivity?.activityId ?? NO_ACTIVITY_CACHE_KEY_SENTINEL,
                    stakeKeys,
                    accountAddressCount: accountAddresses.length,
                  }),
                };
              },
            ),
            filter((params): params is FetchParams => !!params),
          );

          return rxMerge(
            naturalTrigger$.pipe(
              map(params => ({ params, isRetry: false as const })),
            ),
            retryTrigger$.pipe(
              map(params => ({ params, isRetry: true as const })),
            ),
          ).pipe(
            switchMap(({ params, isRetry }): Observable<CardanoSyncAction> => {
              const {
                accountAddresses,
                stakeKeys,
                cacheKey,
                topActivity,
                tip,
              } = params;
              return forkJoin(
                stakeKeys.map(rewardAccount =>
                  getAccountUtxos({ rewardAccount }, { chainId }),
                ),
              ).pipe(
                map(results => {
                  const firstError = results.find(r => r.isErr());
                  if (firstError) throw firstError.unwrapErr();
                  return results.flatMap(r => r.unwrap());
                }),
                retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
                map(utxos =>
                  filterLegitimateUtxos({
                    utxos,
                    accountAddresses,
                    logger,
                    accountId,
                  }),
                ),
                withLatestFrom(selectAccountUtxos$),
                mergeMap(([utxos, storedUtxosByAccount]) => {
                  const storedEntry = storedUtxosByAccount[accountId];
                  const hasUtxosChanged =
                    storedEntry === undefined ||
                    !utxoSetsEqual(utxos, storedEntry);
                  const isTipBeyondDepth = isTipBeyondConfirmationDepth(
                    topActivity,
                    tip,
                  );
                  const shouldAdvanceCacheKey =
                    isRetry || hasUtxosChanged || isTipBeyondDepth;

                  const emissions: Observable<CardanoSyncAction>[] = [
                    of(
                      actions.cardanoContext.setAccountUtxos({
                        accountId,
                        utxos,
                      }),
                    ),
                  ];
                  if (shouldAdvanceCacheKey) {
                    emissions.push(
                      of(
                        actions.cardanoContext.setLastFetchedUtxoCacheKey({
                          accountId,
                          cacheKey,
                        }),
                      ),
                    );
                  }
                  emissions.push(
                    of(CardanoUtxoFetchFailureId(accountId)).pipe(
                      autoDismissFailureOnSuccess(selectFailureById$),
                    ),
                  );
                  return rxMerge(...emissions);
                }),
                catchError(() =>
                  of(
                    actions.failures.addFailure({
                      failureId: CardanoUtxoFetchFailureId(accountId),
                      message:
                        'sync.error.cardano-utxo-fetch-failed' as TranslationKey,
                    }),
                  ),
                ),
              );
            }),
          );
        }),
      ),
    ),
  );

const filterLegitimateUtxos = (params: {
  utxos: Cardano.Utxo[];
  accountAddresses: AnyAddress<CardanoAddressData>[];
  logger: Parameters<SideEffect>[2]['logger'];
  accountId: AccountId;
}): Cardano.Utxo[] => {
  const { utxos, accountAddresses, logger, accountId } = params;
  const ownedCredentials = extractOwnedPaymentCredentials(accountAddresses);
  const { legitimate, franken } = filterFrankenUtxos(utxos, ownedCredentials);
  if (franken.length > 0) {
    logger.warn(
      `Filtered ${franken.length} franken UTxOs for account ${accountId}`,
    );
  }
  return legitimate;
};
