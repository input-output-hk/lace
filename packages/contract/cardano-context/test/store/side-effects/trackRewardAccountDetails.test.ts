import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { failuresActions } from '@lace-contract/failures';
import { testSideEffect } from '@lace-lib/util-dev';
import { Serializable } from '@lace-lib/util-store';
import { BigNumber, Err, Ok, Timestamp } from '@lace-sdk/util';
import { defer, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CardanoPaymentAddress, CardanoRewardAccount } from '../../../src';
import { REWARD_ACCOUNT_DETAILS_SYNC_CONFIRMATION_DEPTH } from '../../../src/const';
import { cardanoContextActions } from '../../../src/store';
import { trackRewardAccountDetails } from '../../../src/store/side-effects/track-reward-account-details';
import {
  CardanoRewardAccountDetailsFailureId,
  RewardAccountDetailsCacheKey,
} from '../../../src/value-objects';
import {
  cardanoAccount0Addr,
  chainId,
  threeAccountCardanoWalletAccounts,
} from '../../mocks';

import type {
  CardanoProviderDependencies,
  RewardAccountDetails,
  RewardAccountInfo,
} from '../../../src/types';
import type { Activity } from '@lace-contract/activities';
import type { AnyAddress } from '@lace-contract/addresses';
import type { Failure, FailureId } from '@lace-contract/failures';
import type { TranslationKey } from '@lace-contract/i18n';
import type { AnyAccount, AccountId } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';
import type { RunHelpers } from 'rxjs/testing';

const actions = {
  ...cardanoContextActions,
  ...failuresActions,
};

const noFailureSelector = (_id: FailureId): Failure | undefined => undefined;

const account = threeAccountCardanoWalletAccounts[0];
const { accountId } = account;

const rewardAccount1 = CardanoRewardAccount(
  'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
);

const mockAddress1: AnyAddress = {
  ...cardanoAccount0Addr,
  accountId,
  data: {
    rewardAccount: rewardAccount1,
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  },
};

const addressWithoutRewardAccount: AnyAddress = {
  address: CardanoPaymentAddress(
    'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl',
  ),
  accountId,
  blockchainName: 'Cardano',
  data: { rewardAccount: undefined },
};

const mockRewardAccountInfo: RewardAccountInfo = {
  isActive: true,
  isRegistered: true,
  rewardsSum: BigNumber(100_000_000n),
  withdrawableAmount: BigNumber(100_000_000n),
  controlledAmount: BigNumber(500_000_000n),
};

const mockRewardAccountInfoWithDrep: RewardAccountInfo = {
  ...mockRewardAccountInfo,
  drepId: 'drep1abc',
};

const mockDetails: RewardAccountDetails = {
  rewardAccountInfo: mockRewardAccountInfo,
};

const mockDetailsWithDrep: RewardAccountDetails = {
  rewardAccountInfo: mockRewardAccountInfoWithDrep,
};

const txActivity = (id: string, slot?: number): Activity => ({
  accountId,
  activityId: id,
  timestamp: Timestamp(id.length),
  tokenBalanceChanges: [],
  type: ActivityType.Send,
  ...(slot !== undefined && {
    blockchainSpecific: { Cardano: { slot: Cardano.Slot(slot) } },
  }),
});

const activityOfType = (id: string, type: ActivityType): Activity => ({
  accountId,
  activityId: id,
  timestamp: Timestamp(id.length),
  tokenBalanceChanges: [],
  type,
});

/**
 * `topId` is the reward-inclusive top; `txId` is the reward-excluded top.
 * They coincide unless a Rewards entry sits above the topmost on-chain tx,
 * in which case pass both explicitly.
 */
const cacheKeyFor = (topId: string, txId: string = topId) =>
  RewardAccountDetailsCacheKey({
    topNonPendingActivityId: topId,
    topOnChainTxActivityId: txId,
    stakeKey: rewardAccount1,
  });

type PersistedCacheKeys = Partial<
  Record<AccountId, ReturnType<typeof cacheKeyFor>>
>;
type StoredRewardDetailsRaw = Partial<
  Record<AccountId, Serializable<RewardAccountDetails>>
>;
const emptyPersisted: PersistedCacheKeys = {};
const emptyStored: StoredRewardDetailsRaw = {};
const emptyFailures: Record<FailureId, Failure> = {};
const undefinedTip: Cardano.Tip | undefined = undefined;

const tipAtSlot = (slot: number): Cardano.Tip => ({
  slot: Cardano.Slot(slot),
  hash: Cardano.BlockId(
    '1111111111111111111111111111111111111111111111111111111111111111',
  ),
  blockNo: Cardano.BlockNo(1),
});

const retriableError = new ProviderError(ProviderFailure.Unhealthy);

type HarnessOverrides = {
  accounts$?: Observable<AnyAccount[]>;
  addresses$?: Observable<AnyAddress[]>;
  activities$?: Observable<Record<string, Activity[]>>;
  persistedCacheKeys$?: Observable<PersistedCacheKeys>;
  storedDetails$?: Observable<StoredRewardDetailsRaw>;
  tip$?: Observable<Cardano.Tip | undefined>;
  selectFailureById$?: Observable<(id: FailureId) => Failure | undefined>;
  allFailures$?: Observable<Record<FailureId, Failure>>;
  retrySyncRound$?: Observable<
    ReturnType<typeof cardanoContextActions.cardanoContext.retrySyncRound>
  >;
};

/** Each override is a pre-built observable so callers can stage multi-frame marbles. */
const buildHarness = (
  cold: RunHelpers['cold'],
  overrides: HarnessOverrides = {},
) => ({
  actionObservables: {
    cardanoContext: {
      retrySyncRound$: overrides.retrySyncRound$ ?? cold('-'),
    },
  },
  stateObservables: {
    wallets: {
      selectActiveNetworkAccounts$:
        overrides.accounts$ ?? cold<AnyAccount[]>('a', { a: [account] }),
    },
    addresses: {
      selectAllAddresses$:
        overrides.addresses$ ?? cold<AnyAddress[]>('a', { a: [mockAddress1] }),
    },
    activities: {
      selectAllMap$:
        overrides.activities$ ??
        cold<Record<string, Activity[]>>('a', {
          a: { [accountId]: [txActivity('tx-1')] },
        }),
    },
    cardanoContext: {
      selectLastFetchedRewardAccountDetailsCacheKeyByAccount$:
        overrides.persistedCacheKeys$ ?? cold('a', { a: emptyPersisted }),
      selectRewardAccountDetailsRaw$:
        overrides.storedDetails$ ?? cold('a', { a: emptyStored }),
      selectTip$: overrides.tip$ ?? cold('a', { a: undefinedTip }),
    },
    failures: {
      selectFailureById$:
        overrides.selectFailureById$ ?? cold('a', { a: noFailureSelector }),
      selectAllFailures$:
        overrides.allFailures$ ?? cold('a', { a: emptyFailures }),
    },
  },
});

const provider = (getRewardAccountInfo: ReturnType<typeof vi.fn>) => ({
  cardanoProvider: {
    getRewardAccountInfo,
  } as unknown as CardanoProviderDependencies['cardanoProvider'],
  actions,
});

const provideOk = (cold: RunHelpers['cold'], info = mockRewardAccountInfo) =>
  vi.fn().mockImplementation(() => cold('(a|)', { a: Ok(info) }));

describe('trackRewardAccountDetails', () => {
  it('fetches reward account info on initial emission and advances cacheKey', () => {
    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => {
      const getRewardAccountInfo = provideOk(cold);
      return {
        ...buildHarness(cold),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
            b: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              { accountId, cacheKey: cacheKeyFor('tx-1') },
            ),
          });
        },
      };
    });
  });

  it('skips fetch on cold start when persisted cacheKey matches current state', () => {
    testSideEffect(
      trackRewardAccountDetails,
      ({ cold, expectObservable, flush }) => {
        const getRewardAccountInfo = vi.fn();
        return {
          ...buildHarness(cold, {
            persistedCacheKeys$: cold('a', {
              a: { [accountId]: cacheKeyFor('tx-1') } as PersistedCacheKeys,
            }),
          }),
          dependencies: provider(getRewardAccountInfo),
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();
            expect(getRewardAccountInfo).not.toHaveBeenCalled();
          },
        };
      },
    );
  });

  it('refetches when the topmost non-Pending activity id changes', () => {
    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => {
      const getRewardAccountInfo = provideOk(cold);
      return {
        ...buildHarness(cold, {
          activities$: cold('a----b', {
            a: { [accountId]: [txActivity('tx-1')] },
            b: { [accountId]: [txActivity('tx-2'), txActivity('tx-1')] },
          }),
        }),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)-(cd)', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
            b: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              { accountId, cacheKey: cacheKeyFor('tx-1') },
            ),
            c: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
            d: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              { accountId, cacheKey: cacheKeyFor('tx-2') },
            ),
          });
        },
      };
    });
  });

  it('does not trigger a fetch when only a Pending activity is inserted on top', () => {
    testSideEffect(
      trackRewardAccountDetails,
      ({ cold, expectObservable, flush }) => {
        const getRewardAccountInfo = provideOk(cold);
        return {
          ...buildHarness(cold, {
            activities$: cold('a----b', {
              a: { [accountId]: [txActivity('tx-1')] },
              b: {
                [accountId]: [
                  activityOfType('tx-2', ActivityType.Pending),
                  txActivity('tx-1'),
                ],
              },
            }),
          }),
          dependencies: provider(getRewardAccountInfo),
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.cardanoContext.setRewardAccountDetails({
                accountId,
                details: mockDetails,
              }),
              b: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
                { accountId, cacheKey: cacheKeyFor('tx-1') },
              ),
            });
            flush();
            expect(getRewardAccountInfo).toHaveBeenCalledTimes(1);
          },
        };
      },
    );
  });

  it('refetches when a Pending tx becomes confirmed in-place (same activityId)', () => {
    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => {
      const getRewardAccountInfo = provideOk(cold);
      return {
        ...buildHarness(cold, {
          activities$: cold('a----b----c', {
            a: { [accountId]: [txActivity('tx-prior')] },
            b: {
              [accountId]: [
                activityOfType('tx-X', ActivityType.Pending),
                txActivity('tx-prior'),
              ],
            },
            c: {
              [accountId]: [txActivity('tx-X'), txActivity('tx-prior')],
            },
          }),
        }),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)------(cd)', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
            b: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              { accountId, cacheKey: cacheKeyFor('tx-prior') },
            ),
            c: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
            d: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              { accountId, cacheKey: cacheKeyFor('tx-X') },
            ),
          });
        },
      };
    });
  });

  it('refetches when a Rewards activity is inserted on top (epoch reward arrival)', () => {
    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => {
      const getRewardAccountInfo = provideOk(cold);
      return {
        ...buildHarness(cold, {
          activities$: cold('a----b', {
            a: { [accountId]: [txActivity('tx-1')] },
            b: {
              [accountId]: [
                activityOfType('reward-1', ActivityType.Rewards),
                txActivity('tx-1'),
              ],
            },
          }),
        }),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)-(cd)', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
            b: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              { accountId, cacheKey: cacheKeyFor('tx-1') },
            ),
            c: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
            d: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              { accountId, cacheKey: cacheKeyFor('reward-1', 'tx-1') },
            ),
          });
        },
      };
    });
  });

  it('refetches when a tx confirms below a future-dated reward already on top (stake-pool / drep change)', () => {
    // Regression: rewards are timestamped by their spendable date (epochs
    // ahead — see getRewardSpendableDate), so a reward can sit atop the
    // activity list while a freshly confirmed delegation/vote tx lands *below*
    // it. The reward-inclusive top (reward-1) never moves, so keying the
    // cacheKey on it alone froze poolId/drepId until reload. The
    // reward-excluded anchor (tx-old → tx-new) must advance the key so the
    // refetch fires and the new pool/drep lands. drepId stands in for the
    // changed field here; poolId behaves identically (both equalRewardAccountInfo
    // fields).
    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => {
      const getRewardAccountInfo = vi
        .fn()
        .mockImplementationOnce(() =>
          cold('(a|)', { a: Ok(mockRewardAccountInfo) }),
        )
        .mockImplementation(() =>
          cold('(a|)', { a: Ok(mockRewardAccountInfoWithDrep) }),
        );
      return {
        ...buildHarness(cold, {
          activities$: cold('a----b', {
            a: {
              [accountId]: [
                activityOfType('reward-1', ActivityType.Rewards),
                txActivity('tx-old'),
              ],
            },
            b: {
              [accountId]: [
                activityOfType('reward-1', ActivityType.Rewards),
                txActivity('tx-new'),
                txActivity('tx-old'),
              ],
            },
          }),
        }),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)-(cd)', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
            b: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              { accountId, cacheKey: cacheKeyFor('reward-1', 'tx-old') },
            ),
            c: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetailsWithDrep,
            }),
            d: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              { accountId, cacheKey: cacheKeyFor('reward-1', 'tx-new') },
            ),
          });
        },
      };
    });
  });

  it('does not advance cacheKey when fetched info equals stored AND tip is before confirmation depth', () => {
    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => {
      const getRewardAccountInfo = provideOk(cold);
      return {
        ...buildHarness(cold, {
          activities$: cold('a', {
            a: { [accountId]: [txActivity('tx-1', 1000)] },
          }),
          storedDetails$: cold('a', {
            a: {
              [accountId]: Serializable.to(mockDetails),
            } as StoredRewardDetailsRaw,
          }),
          // Tip slot 1001 is well before 1000 + DEPTH (60).
          tip$: cold('a', { a: tipAtSlot(1001) }),
        }),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
          });
        },
      };
    });
  });

  it('keeps the indexer-lag loop alive when a slot-less Rewards entry sits on top of a just-confirmed cert', () => {
    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => {
      const getRewardAccountInfo = provideOk(cold);
      return {
        ...buildHarness(cold, {
          // Reward (no slot, newest) on top of a just-confirmed cert tx at
          // slot 1000. The reward-inclusive cacheKey is anchored on the
          // reward, but the confirmation-depth anchor must remain the cert.
          activities$: cold('a', {
            a: {
              [accountId]: [
                activityOfType('reward-1', ActivityType.Rewards),
                txActivity('tx-cert', 1000),
              ],
            },
          }),
          // Provider still lagging: fetched equals stored.
          storedDetails$: cold('a', {
            a: {
              [accountId]: Serializable.to(mockDetails),
            } as StoredRewardDetailsRaw,
          }),
          // Tip slot 1001 is well before the cert slot 1000 + DEPTH (60).
          tip$: cold('a', { a: tipAtSlot(1001) }),
        }),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          // Only the details write — the cacheKey must NOT advance, so the
          // tip-driven loop keeps polling until the provider reflects the
          // cert. Anchored on the slot-less reward, the old code would have
          // advanced here and frozen stale data.
          expectObservable(sideEffect$).toBe('a', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
          });
        },
      };
    });
  });

  it('advances the cacheKey for a slot-less Rewards entry on top of a cert once the cert is past confirmation depth', () => {
    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => {
      const getRewardAccountInfo = provideOk(cold);
      const farTipSlot =
        1000 + REWARD_ACCOUNT_DETAILS_SYNC_CONFIRMATION_DEPTH + 1;
      return {
        ...buildHarness(cold, {
          // Same shape as the indexer-lag case above (slot-less reward on top
          // of a cert at slot 1000), but the tip has now moved past the cert's
          // confirmation depth. The confirmation anchor is the cert — not the
          // slot-less reward — so the depth gate fires and the cacheKey
          // advances even though fetched still equals stored.
          activities$: cold('a', {
            a: {
              [accountId]: [
                activityOfType('reward-1', ActivityType.Rewards),
                txActivity('tx-cert', 1000),
              ],
            },
          }),
          storedDetails$: cold('a', {
            a: {
              [accountId]: Serializable.to(mockDetails),
            } as StoredRewardDetailsRaw,
          }),
          tip$: cold('a', { a: tipAtSlot(farTipSlot) }),
        }),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
            b: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              // Reward-inclusive top is the reward; reward-excluded top (the
              // confirmation anchor) is the cert.
              { accountId, cacheKey: cacheKeyFor('reward-1', 'tx-cert') },
            ),
          });
        },
      };
    });
  });

  it('refetches on the next tip tick when the persisted cacheKey is still behind (indexer-lag loop)', () => {
    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => {
      const getRewardAccountInfo = provideOk(cold);
      return {
        ...buildHarness(cold, {
          activities$: cold('a', {
            a: { [accountId]: [txActivity('tx-1', 1000)] },
          }),
          // Stored equals fetched + tip within depth → first fetch does NOT
          // advance the persisted cacheKey. The tip tick at frame 5 then has
          // the same cacheKey but different tip.slot — distinctUntilChanged
          // lets it through, so the trigger re-fires for a second fetch.
          storedDetails$: cold('a', {
            a: {
              [accountId]: Serializable.to(mockDetails),
            } as StoredRewardDetailsRaw,
          }),
          tip$: cold('a----b', { a: tipAtSlot(1001), b: tipAtSlot(1002) }),
        }),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('a----b', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
            b: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
          });
        },
      };
    });
  });

  it('advances cacheKey when fetched info differs from stored', () => {
    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => {
      const getRewardAccountInfo = provideOk(
        cold,
        mockRewardAccountInfoWithDrep,
      );
      return {
        ...buildHarness(cold, {
          activities$: cold('a', {
            a: { [accountId]: [txActivity('tx-1', 1000)] },
          }),
          storedDetails$: cold('a', {
            a: {
              [accountId]: Serializable.to(mockDetails),
            } as StoredRewardDetailsRaw,
          }),
          tip$: cold('a', { a: tipAtSlot(1001) }),
        }),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetailsWithDrep,
            }),
            b: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              { accountId, cacheKey: cacheKeyFor('tx-1') },
            ),
          });
        },
      };
    });
  });

  it('advances cacheKey when tip is past confirmation depth, even if fetched info equals stored', () => {
    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => {
      const getRewardAccountInfo = provideOk(cold);
      const farTipSlot =
        1000 + REWARD_ACCOUNT_DETAILS_SYNC_CONFIRMATION_DEPTH + 1;
      return {
        ...buildHarness(cold, {
          activities$: cold('a', {
            a: { [accountId]: [txActivity('tx-1', 1000)] },
          }),
          storedDetails$: cold('a', {
            a: {
              [accountId]: Serializable.to(mockDetails),
            } as StoredRewardDetailsRaw,
          }),
          tip$: cold('a', { a: tipAtSlot(farTipSlot) }),
        }),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
            b: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              { accountId, cacheKey: cacheKeyFor('tx-1') },
            ),
          });
        },
      };
    });
  });

  it('manual retry: refetches and advances cacheKey unconditionally when retrySyncRound$ fires for a failed account', () => {
    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => {
      const failureId = CardanoRewardAccountDetailsFailureId(accountId);
      const existingFailure: Failure = {
        failureId,
        message:
          'sync.error.cardano-reward-account-details-failed' as TranslationKey,
      };
      const getRewardAccountInfo = provideOk(cold);
      return {
        ...buildHarness(cold, {
          activities$: cold('a', {
            a: { [accountId]: [txActivity('tx-1', 1000)] },
          }),
          persistedCacheKeys$: cold('a', {
            a: { [accountId]: cacheKeyFor('tx-1') } as PersistedCacheKeys,
          }),
          // Stored equals fetched → without `isRetry`, cacheKey would not
          // advance. The retry path must bypass that gate.
          storedDetails$: cold('a', {
            a: {
              [accountId]: Serializable.to(mockDetails),
            } as StoredRewardDetailsRaw,
          }),
          tip$: cold('a', { a: tipAtSlot(1001) }),
          // of(...) for selectFailureById$: autoDismissFailureOnSuccess uses
          // withLatestFrom which needs the secondary to have emitted before
          // the synchronous `of(failureId)` source it wraps. cold emissions
          // at the same frame race with the sync source.
          selectFailureById$: of((id: FailureId) =>
            id === failureId ? existingFailure : undefined,
          ),
          allFailures$: cold('a', {
            a: { [failureId]: existingFailure } as Record<FailureId, Failure>,
          }),
          retrySyncRound$: cold('-a', {
            a: cardanoContextActions.cardanoContext.retrySyncRound(),
          }),
        }),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-(abc)', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
            b: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              { accountId, cacheKey: cacheKeyFor('tx-1') },
            ),
            c: actions.failures.dismissFailure(failureId),
          });
        },
      };
    });
  });

  it('manual retry: skipped when no failure is recorded for the account', () => {
    testSideEffect(
      trackRewardAccountDetails,
      ({ cold, expectObservable, flush }) => {
        const getRewardAccountInfo = vi.fn();
        return {
          ...buildHarness(cold, {
            persistedCacheKeys$: cold('a', {
              a: { [accountId]: cacheKeyFor('tx-1') } as PersistedCacheKeys,
            }),
            retrySyncRound$: cold('-a', {
              a: cardanoContextActions.cardanoContext.retrySyncRound(),
            }),
          }),
          dependencies: provider(getRewardAccountInfo),
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();
            expect(getRewardAccountInfo).not.toHaveBeenCalled();
          },
        };
      },
    );
  });

  it('emits addFailure after provider exhaustion', () => {
    let subscriptions = 0;
    const getRewardAccountInfo = vi.fn().mockImplementation(() =>
      defer(() => {
        subscriptions += 1;
        return defer(() => {
          throw retriableError;
        });
      }),
    );

    testSideEffect(
      trackRewardAccountDetails,
      ({ cold, expectObservable, flush }) => ({
        ...buildHarness(cold),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          // retryBackoff: 300ms + 600ms + 1200ms = 2100ms before failure.
          expectObservable(sideEffect$).toBe('2100ms a', {
            a: actions.failures.addFailure({
              failureId: CardanoRewardAccountDetailsFailureId(accountId),
              message:
                'sync.error.cardano-reward-account-details-failed' as TranslationKey,
            }),
          });
          flush();
          expect(subscriptions).toBe(4);
        },
      }),
    );
  });

  it('auto-dismisses an existing failure after a successful fetch', () => {
    const failureId = CardanoRewardAccountDetailsFailureId(accountId);
    const existingFailure: Failure = {
      failureId,
      message:
        'sync.error.cardano-reward-account-details-failed' as TranslationKey,
    };

    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => {
      const getRewardAccountInfo = provideOk(cold);
      return {
        ...buildHarness(cold, {
          // of(...) for selectFailureById$: autoDismissFailureOnSuccess uses
          // withLatestFrom which needs the secondary to have emitted before
          // the synchronous `of(failureId)` source it wraps. cold emissions
          // at the same frame race with the sync source.
          selectFailureById$: of((id: FailureId) =>
            id === failureId ? existingFailure : undefined,
          ),
          allFailures$: cold('a', {
            a: { [failureId]: existingFailure } as Record<FailureId, Failure>,
          }),
        }),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(abc)', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
            b: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              { accountId, cacheKey: cacheKeyFor('tx-1') },
            ),
            c: actions.failures.dismissFailure(failureId),
          });
        },
      };
    });
  });

  it('does nothing when the account has no stake keys', () => {
    const getRewardAccountInfo = vi.fn();

    testSideEffect(
      trackRewardAccountDetails,
      ({ cold, expectObservable, flush }) => ({
        ...buildHarness(cold, {
          addresses$: cold('a', { a: [addressWithoutRewardAccount] }),
        }),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
          flush();
          expect(getRewardAccountInfo).not.toHaveBeenCalled();
        },
      }),
    );
  });

  it('fetches reward details for an account with stake keys but no synced activities', () => {
    testSideEffect(trackRewardAccountDetails, ({ cold, expectObservable }) => {
      const getRewardAccountInfo = provideOk(cold);
      return {
        ...buildHarness(cold, {
          // No activities yet — e.g. a fresh restore before history arrives.
          activities$: cold<Record<string, Activity[]>>('a', { a: {} }),
        }),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('(ab)', {
            a: actions.cardanoContext.setRewardAccountDetails({
              accountId,
              details: mockDetails,
            }),
            b: actions.cardanoContext.setLastFetchedRewardAccountDetailsCacheKey(
              // Stake-key-only cacheKey (empty activity id prefix).
              { accountId, cacheKey: cacheKeyFor('') },
            ),
          });
        },
      };
    });
  });

  it('emits no further dispatches after the account set shrinks (switchMap cancellation)', () => {
    testSideEffect(
      trackRewardAccountDetails,
      ({ cold, expectObservable, flush }) => {
        // 10-frame fetch keeps the inner stream alive past the account-set
        // shrink at frame 5, so the switchMap teardown is what produces the
        // empty marble (rather than the fetch simply not having started yet).
        const getRewardAccountInfo = vi
          .fn()
          .mockReturnValue(
            cold('----------a|', { a: Ok(mockRewardAccountInfo) }),
          );
        return {
          ...buildHarness(cold, {
            accounts$: cold<AnyAccount[]>('a----b', {
              a: [account],
              b: [],
            }),
          }),
          dependencies: provider(getRewardAccountInfo),
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();
          },
        };
      },
    );
  });

  it('surfaces non-retriable provider errors as a failure', () => {
    const getRewardAccountInfo = vi
      .fn()
      .mockReturnValue(of(Err(retriableError)));

    testSideEffect(
      trackRewardAccountDetails,
      ({ cold, expectObservable, flush }) => ({
        ...buildHarness(cold),
        dependencies: provider(getRewardAccountInfo),
        assertion: sideEffect$ => {
          // The Err is unwrapped by `map` and rethrown into retryBackoff,
          // which exhausts after 2100ms.
          expectObservable(sideEffect$).toBe('2100ms a', {
            a: actions.failures.addFailure({
              failureId: CardanoRewardAccountDetailsFailureId(accountId),
              message:
                'sync.error.cardano-reward-account-details-failed' as TranslationKey,
            }),
          });
          flush();
        },
      }),
    );
  });

  /**
   * Static guard: if `RewardAccountInfo` grows a new field, this fails and
   * forces an update to `equalRewardAccountInfo` inside the side effect.
   * Keeps the indexer-lag-bypass cacheKey gate honest.
   */
  it('equalRewardAccountInfo guard: RewardAccountInfo has the expected number of fields', () => {
    const sample: Required<RewardAccountInfo> = {
      poolId: 'pool1' as unknown as NonNullable<RewardAccountInfo['poolId']> &
        RewardAccountInfo['poolId'],
      drepId: 'drep1abc',
      rewardsSum: BigNumber(0n),
      isActive: false,
      isRegistered: false,
      controlledAmount: BigNumber(0n),
      withdrawableAmount: BigNumber(0n),
    };
    expect(Object.keys(sample)).toHaveLength(7);
  });
});
