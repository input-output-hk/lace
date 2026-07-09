import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { Serializable } from '@lace-lib/util-store';
import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  merge as rxMerge,
  mergeMap,
  of,
  switchMap,
  withLatestFrom,
} from 'rxjs';

import { REWARD_ACCOUNT_DETAILS_SYNC_CONFIRMATION_DEPTH } from '../../const';
import { isCardanoAccount } from '../../util';
import {
  CardanoRewardAccountDetailsFailureId,
  RewardAccountDetailsCacheKey,
} from '../../value-objects';
import { extractUniqueStakeKeys } from '../helpers/extract-unique-stake-keys';
import { getTopOnChainActivity } from '../helpers/get-top-on-chain-activity-id';
import { groupCardanoAddressesByAccount } from '../helpers/group-cardano-addresses-by-account';

import type { CardanoContextAction, SideEffect } from '../../contract';
import type {
  CardanoRewardAccount as CardanoRewardAccountType,
  RewardAccountDetails,
  RewardAccountInfo,
} from '../../types';
import type { TopOnChainActivity } from '../helpers/get-top-on-chain-activity-id';
import type { Cardano } from '@cardano-sdk/core';
import type { TranslationKey } from '@lace-contract/i18n';
import type { Observable } from 'rxjs';

type FetchParams = {
  stakeKey: CardanoRewardAccountType;
  cacheKey: RewardAccountDetailsCacheKey;
  /**
   * Most-recent slotted on-chain tx (Rewards excluded). Its slot gates the
   * confirmation-depth refetch loop; its id is the reward-excluded anchor of
   * {@link cacheKey}, so a tx confirming below a future-dated reward still
   * advances the key.
   */
  confirmationAnchor: TopOnChainActivity | undefined;
  tip: Cardano.Tip | undefined;
};

/**
 * `BigNumber` here is the `@lace-sdk/util` Tagged-string type, so strict
 * equality is correct for the numeric fields too — do not switch to `.eq()`.
 *
 * If a new field is added to {@link RewardAccountInfo}, the field-count
 * assertion in the unit test breaks and forces this function to be updated.
 */
const equalRewardAccountInfo = (
  a: RewardAccountInfo,
  b: RewardAccountInfo,
): boolean =>
  a.poolId === b.poolId &&
  a.drepId === b.drepId &&
  a.isActive === b.isActive &&
  a.isRegistered === b.isRegistered &&
  a.rewardsSum === b.rewardsSum &&
  a.controlledAmount === b.controlledAmount &&
  a.withdrawableAmount === b.withdrawableAmount;

const isTipBeyondConfirmationDepth = (
  confirmationAnchor: TopOnChainActivity | undefined,
  tip: Cardano.Tip | undefined,
): boolean => {
  if (!tip) return false;
  // No anchoring slot → treat as already settled, stopping the tip-driven
  // refetch loop. This covers: activities persisted before the slot field
  // existed (not newly received post-upgrade), and accounts with no slotted
  // on-chain tx at all (only rewards, or no activities yet). The anchor is
  // deliberately the most-recent *slotted* on-chain tx (Rewards excluded):
  // a slot-less epoch reward landing on top of a just-confirmed cert must
  // not short-circuit this loop while the provider's reward-account
  // endpoint still lags, or stale fields (e.g. drepId) would freeze in.
  if (confirmationAnchor?.slot === undefined) return true;
  return (
    tip.slot - confirmationAnchor.slot >=
    REWARD_ACCOUNT_DETAILS_SYNC_CONFIRMATION_DEPTH
  );
};

/**
 * Mirrors {@link trackAccountUtxos}. Per-account natural trigger gated by a
 * cacheKey of `(topNonPendingActivityId, topOnChainTxActivityId, stakeKey)`;
 * plus a manual retry trigger on `retrySyncRound$` that bypasses the gate for
 * accounts holding a `CardanoRewardAccountDetailsFailureId`.
 *
 * The cacheKey carries two activity anchors (see
 * {@link RewardAccountDetailsCacheKey}) so it advances on both an epoch reward
 * arrival and a confirmed tx — the latter even when a future-dated reward
 * masks it as the topmost activity.
 *
 * Indexer-lag handling: the persisted cacheKey is advanced only when the
 * fetched info differs from stored OR the tip is past
 * {@link REWARD_ACCOUNT_DETAILS_SYNC_CONFIRMATION_DEPTH} slots beyond the
 * confirmation anchor's slot. Until then, every tip tick re-fetches so a
 * just-confirmed cert's effect can land even if Blockfrost's reward-account
 * endpoint is lagging. The confirmation anchor's slot gates this loop (the
 * most-recent slotted on-chain tx, Rewards excluded) — a slot-less epoch
 * reward must not satisfy the depth gate, or stale fields would freeze in
 * prematurely.
 *
 * Only the first stake key per account is fetched (preserves prior
 * behavior). Accounts with no stake keys are skipped; accounts with stake
 * keys but no synced activities still fetch (anchored by a stake-key-only
 * cacheKey), so reward details load before transaction history arrives.
 */
export const trackRewardAccountDetails: SideEffect = (
  { cardanoContext: { retrySyncRound$ } },
  {
    wallets: { selectActiveNetworkAccounts$ },
    addresses: { selectAllAddresses$ },
    activities: { selectAllMap$ },
    cardanoContext: {
      selectLastFetchedRewardAccountDetailsCacheKeyByAccount$,
      selectRewardAccountDetailsRaw$,
      selectTip$,
    },
    failures: { selectFailureById$, selectAllFailures$ },
  },
  { actions, cardanoProvider: { getRewardAccountInfo } },
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
            selectAllMap$,
            selectAllAddresses$,
            selectTip$,
          ]).pipe(
            map(([activitiesByAccount, allAddresses, tip]) => {
              const stakeKeys = extractUniqueStakeKeys(
                computeAccountAddresses(allAddresses),
              );
              return {
                // Reward-inclusive top: an epoch reward landing on top
                // advances the cacheKey so rewardsSum refreshes.
                topActivity: getTopOnChainActivity(
                  activitiesByAccount,
                  accountId,
                  true,
                ),
                // Reward-excluded top: feeds the cacheKey's tx anchor (refetch
                // on confirmations) and the confirmation-depth loop's slot
                // (never a slot-less reward; see isTipBeyondConfirmationDepth).
                confirmationAnchor: getTopOnChainActivity(
                  activitiesByAccount,
                  accountId,
                  false,
                ),
                stakeKeys,
                tip,
              };
            }),
            // Gate on stake keys only — reward account info depends on the
            // stake key, not on having a synced activity. Accounts with no
            // activities yet (fresh restore before history arrives) must
            // still fetch; an absent activity yields a stake-key-only
            // cacheKey below.
            filter(({ stakeKeys }) => stakeKeys.length > 0),
            map(({ stakeKeys, topActivity, confirmationAnchor, tip }) => ({
              stakeKey: stakeKeys[0],
              confirmationAnchor,
              tip,
              cacheKey: RewardAccountDetailsCacheKey({
                topNonPendingActivityId: topActivity?.activityId ?? '',
                // Reward-excluded top: advances the key on a confirmed tx even
                // when a future-dated reward sits on top of it (see the VO doc).
                topOnChainTxActivityId: confirmationAnchor?.activityId ?? '',
                stakeKey: stakeKeys[0],
              }),
            })),
            distinctUntilChanged(
              // cacheKey already encodes both anchor ids; tip.slot drives the
              // indexer-lag re-fetch loop. confirmationAnchor.slot is retained
              // for the rare reorg where the same tx id is re-included at a new
              // slot (changes the depth gate) while cacheKey and tip.slot hold.
              (a, b) =>
                a.cacheKey === b.cacheKey &&
                a.tip?.slot === b.tip?.slot &&
                a.confirmationAnchor?.slot === b.confirmationAnchor?.slot,
            ),

            withLatestFrom(
              selectLastFetchedRewardAccountDetailsCacheKeyByAccount$,
            ),
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
                CardanoRewardAccountDetailsFailureId(accountId) in allFailures,
            ),
            map(
              ([, , activitiesByAccount, allAddresses, tip]):
                | FetchParams
                | undefined => {
                const topActivity = getTopOnChainActivity(
                  activitiesByAccount,
                  accountId,
                  true,
                );
                const confirmationAnchor = getTopOnChainActivity(
                  activitiesByAccount,
                  accountId,
                  false,
                );
                const stakeKeys = extractUniqueStakeKeys(
                  computeAccountAddresses(allAddresses),
                );
                if (stakeKeys.length === 0) return undefined;
                return {
                  stakeKey: stakeKeys[0],
                  confirmationAnchor,
                  tip,
                  cacheKey: RewardAccountDetailsCacheKey({
                    topNonPendingActivityId: topActivity?.activityId ?? '',
                    topOnChainTxActivityId:
                      confirmationAnchor?.activityId ?? '',
                    stakeKey: stakeKeys[0],
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
            switchMap(
              ({ params, isRetry }): Observable<CardanoContextAction> => {
                const { stakeKey, cacheKey, confirmationAnchor, tip } = params;
                return getRewardAccountInfo(
                  { rewardAccount: stakeKey },
                  { chainId },
                ).pipe(
                  map(result => {
                    if (result.isErr()) throw result.unwrapErr();
                    return result.unwrap();
                  }),
                  retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
                  withLatestFrom(selectRewardAccountDetailsRaw$),
                  mergeMap(([rewardAccountInfo, storedRaw]) => {
                    const storedSerialized = storedRaw[accountId];
                    const stored = storedSerialized
                      ? Serializable.fromCached<RewardAccountDetails>(
                          storedSerialized,
                        )
                      : undefined;
                    const hasInfoChanged =
                      stored === undefined ||
                      !equalRewardAccountInfo(
                        rewardAccountInfo,
                        stored.rewardAccountInfo,
                      );
                    const isTipBeyondDepth = isTipBeyondConfirmationDepth(
                      confirmationAnchor,
                      tip,
                    );
                    const shouldAdvanceCacheKey =
                      isRetry || hasInfoChanged || isTipBeyondDepth;

                    const emissions: Observable<CardanoContextAction>[] = [
                      of(
                        actions.cardanoContext.setRewardAccountDetails({
                          accountId,
                          details: { rewardAccountInfo },
                        }),
                      ),
                    ];
                    if (shouldAdvanceCacheKey) {
                      emissions.push(
                        of(
                          actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
                            { accountId, cacheKey },
                          ),
                        ),
                      );
                    }
                    emissions.push(
                      of(CardanoRewardAccountDetailsFailureId(accountId)).pipe(
                        autoDismissFailureOnSuccess(selectFailureById$),
                      ),
                    );
                    return rxMerge(...emissions);
                  }),
                  catchError(() =>
                    of(
                      actions.failures.addFailure({
                        failureId:
                          CardanoRewardAccountDetailsFailureId(accountId),
                        message:
                          'sync.error.cardano-reward-account-details-failed' as TranslationKey,
                      }),
                    ),
                  ),
                );
              },
            ),
          );
        }),
      ),
    ),
  );
