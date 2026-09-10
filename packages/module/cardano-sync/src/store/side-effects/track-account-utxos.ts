import {
  CardanoUtxoFetchFailureId,
  extractOwnedPaymentCredentials,
  extractUniqueStakeKeys,
  filterFrankenUtxos,
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

import type { CardanoSyncAction, SideEffect } from '../..';
import type { Cardano } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  CardanoActivityUtxoMetadata,
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
  /** See {@link unspentAnchorOutpoints}. */
  unspentAnchorOwnOutpoints: readonly Cardano.TxIn[];
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

const outpointKey = (outpoint: Cardano.TxIn): string =>
  `${outpoint.txId}#${outpoint.index}`;

/**
 * The anchor's own outpoints that no loaded activity is known to have spent.
 * An outpoint a newer transaction consumed is legitimately absent from a
 * settled fetch — a same-block sibling that wins the timestamp-tie sort, or
 * the next spend — so it cannot stand as evidence that a provider is behind.
 *
 * Evidence-based, so it under-subtracts: an activity carrying no
 * `consumedInputs` reports nothing spent. Pending rows written without
 * blockchain metadata (the staking and earn-rewards flows do this) therefore
 * do not disarm the proof until their confirmed activity maps, which is what
 * bounds the withhold rather than the pending row.
 */
const unspentAnchorOutpoints = (
  topActivity: TopOnChainActivity | undefined,
  accountActivities: Activity[] | undefined,
): readonly Cardano.TxIn[] => {
  const produced = topActivity?.producedOwnOutpoints ?? [];
  if (produced.length === 0) return produced;
  const spentByLoaded = new Set(
    (accountActivities ?? []).flatMap(activity =>
      (
        (
          activity.blockchainSpecific as
            | { Cardano?: CardanoActivityUtxoMetadata }
            | undefined
        )?.Cardano?.consumedInputs ?? []
      ).map(outpointKey),
    ),
  );
  return produced.filter(outpoint => !spentByLoaded.has(outpointKey(outpoint)));
};

/** Order-insensitive equality by outpoint (`txId#index`). */
const utxoSetsEqual = (a: Cardano.Utxo[], b: Cardano.Utxo[]): boolean => {
  if (a.length !== b.length) return false;
  const aKeys = new Set(a.map(utxoKey));
  for (const utxo of b) if (!aKeys.has(utxoKey(utxo))) return false;
  return true;
};

/**
 * Whether this fetch's result can be taken as the settled state for `cacheKey`,
 * which is what advancing the persisted key asserts. Advancing closes the gate:
 * from then on the computed key equals the persisted one, so nothing refetches
 * until the account's next transaction moves the anchor again.
 *
 * `false` keeps the key behind and lets the tip-driven trigger re-verify.
 *
 * The rules below rank, and the two proofs are deliberately asymmetric — see
 * `packages/module/cardano-sync/docs/utxo-cache-key.md` before changing them.
 */
const canTrustFetchAsSettled = ({
  isRetry,
  utxos,
  storedEntry,
  persistedKey,
  cacheKey,
  topActivity,
  unspentAnchorOwnOutpoints,
  tip,
}: {
  /** A manual retry deliberately bypasses every gate below. */
  isRetry: boolean;
  utxos: Cardano.Utxo[];
  storedEntry: Cardano.Utxo[] | undefined;
  persistedKey: UtxoCacheKey | undefined;
  cacheKey: UtxoCacheKey;
  topActivity: TopOnChainActivity | undefined;
  /** See {@link unspentAnchorOutpoints}. */
  unspentAnchorOwnOutpoints: readonly Cardano.TxIn[];
  tip: Cardano.Tip | undefined;
}): boolean => {
  // The provider just handed back an outpoint the anchoring transaction spent.
  // That is not a settled set — it is a set from before that transaction, so
  // accepting it as settled freezes it: the persisted key would equal the
  // computed one, and nothing refetches until the account's next transaction
  // moves the anchor. For an account emptied and then abandoned that never
  // comes, and the pre-spend balance stands forever.
  //
  // Checked against the outpoints, not the activity's type. Type would be a
  // guess: the mapper labels by net balance (`summary.coins > 0 ? Receive :
  // Send`), so a transaction that spends this account's UTxOs but nets positive
  // reads as `Receive`. An overlap is proof, and it needs no ownership
  // resolution — `utxos` holds only this account's UTxOs, so intersecting is
  // already scoped to ours.
  //
  // Self-clearing, so it cannot loop: the overlap disappears as soon as the
  // provider applies the transaction, and then the changed set advances the key
  // on the first branch below. An empty `consumedInputs` means unknown, and
  // falls through to the confirmation-depth rule exactly as before.
  const fetchedOutpoints = new Set(utxos.map(utxoKey));
  const isStaleReadOfSpentOutpoint = (topActivity?.consumedInputs ?? []).some(
    input => fetchedOutpoints.has(`${input.txId}#${input.index}`),
  );
  if (isStaleReadOfSpentOutpoint) return false;

  // The receive mirror: a settled set must contain the anchor's own outpoints
  // that nothing loaded has re-spent — ALL absent proves a pre-receive read.
  // NONE-present, not some-missing: one present proves the tx was applied,
  // and a partially-served multi-stake-key fetch must not read as staleness.
  // Empty carries no evidence and falls through, exactly as consumedInputs.
  const isStaleReadOfMissingProducedOutput =
    unspentAnchorOwnOutpoints.length > 0 &&
    !unspentAnchorOwnOutpoints.some(outpoint =>
      fetchedOutpoints.has(outpointKey(outpoint)),
    );
  if (isStaleReadOfMissingProducedOutput) return false;

  // Checked AFTER both proofs above, deliberately: proof outranks intent. A
  // manual retry exists to get past a fetch failure, not to accept a
  // demonstrably stale set — and the provider that just recovered may still be
  // serving one. Withholding costs the retry nothing: the UTxOs are still written, the
  // failure still auto-dismisses, and the tip-driven trigger keeps re-verifying.
  if (isRetry) return true;

  const hasUtxosChanged =
    storedEntry === undefined || !utxoSetsEqual(utxos, storedEntry);
  // Same activity id, different key: only ownership widened (address discovery
  // / new stake keys). The set was just re-verified under that wider ownership
  // — withholding here waits for a provider catch-up that is not pending, and
  // can strand address-count-gated consumers with no tip movement.
  const isOwnershipOnlyAdvance =
    UtxoCacheKey.topOnChainActivityId(persistedKey) ===
    UtxoCacheKey.topOnChainActivityId(cacheKey);

  return (
    hasUtxosChanged ||
    isTipBeyondConfirmationDepth(topActivity, tip) ||
    isOwnershipOnlyAdvance
  );
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
 *   when the just-fetched UTxO set differs from what we had stored, when the
 *   tip is at least `UTXO_SYNC_CONFIRMATION_DEPTH` slots beyond the anchoring
 *   activity's slot, or when the key moved on ownership alone (same activity
 *   id: address discovery / stake keys widened) — that fetch re-verified the
 *   set under the wider ownership, and nothing newer is awaited from the
 *   provider, so withholding the key would strand consumers that wait for it
 *   to cover the live address count (with no tip movement, forever). While
 *   none holds, the cacheKey stays behind and the natural trigger keeps
 *   re-fetching as the tip advances — this is what unblocks the indexer-lag
 *   stall.
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
              map(activitiesByAccount => {
                const topActivity = getTopOnChainActivity(
                  activitiesByAccount,
                  accountId,
                );
                return {
                  topActivity,
                  unspentAnchorOwnOutpoints: unspentAnchorOutpoints(
                    topActivity,
                    activitiesByAccount[accountId],
                  ),
                };
              }),
            ),
            selectAllAddresses$,
            selectTip$,
          ]).pipe(
            map(([anchor, allAddresses, tip]) => {
              const accountAddresses = computeAccountAddresses(allAddresses);
              const stakeKeys = extractUniqueStakeKeys(accountAddresses);
              return { ...anchor, accountAddresses, stakeKeys, tip };
            }),
            // Not gated on `topActivity` — fetch once addresses + stake keys
            // exist (see the bootstrap note in the JSDoc above).
            filter(p => p.stakeKeys.length > 0),
            map(
              ({
                accountAddresses,
                stakeKeys,
                topActivity,
                unspentAnchorOwnOutpoints,
                tip,
              }) => ({
                accountAddresses,
                stakeKeys,
                topActivity,
                unspentAnchorOwnOutpoints,
                tip,
                cacheKey: UtxoCacheKey({
                  topOnChainActivityId:
                    topActivity?.activityId ?? NO_ACTIVITY_CACHE_KEY_SENTINEL,
                  stakeKeys,
                  accountAddressCount: accountAddresses.length,
                }),
              }),
            ),
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
                  unspentAnchorOwnOutpoints: unspentAnchorOutpoints(
                    topActivity,
                    activitiesByAccount[accountId],
                  ),
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
                unspentAnchorOwnOutpoints,
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
                withLatestFrom(
                  selectAccountUtxos$,
                  selectLastFetchedUtxoCacheKeyByAccount$,
                ),
                mergeMap(([utxos, storedUtxosByAccount, persistedKeys]) => {
                  const shouldAdvanceCacheKey = canTrustFetchAsSettled({
                    isRetry,
                    utxos,
                    storedEntry: storedUtxosByAccount[accountId],
                    persistedKey: persistedKeys[accountId],
                    cacheKey,
                    topActivity,
                    unspentAnchorOwnOutpoints,
                    tip,
                  });

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
                catchError(error => {
                  logger.error(
                    `Utxo fetch failed for account ${accountId}`,
                    error,
                  );
                  return of(
                    actions.failures.addFailure({
                      failureId: CardanoUtxoFetchFailureId(accountId),
                      message:
                        'sync.error.cardano-utxo-fetch-failed' as TranslationKey,
                    }),
                  );
                }),
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
