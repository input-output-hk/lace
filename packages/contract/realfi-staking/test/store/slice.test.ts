import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import {
  realfiStakingActions,
  realfiStakingReducers,
  realfiStakingSelectors,
} from '../../src/store/slice';
import { RealFiPositionId } from '../../src/value-objects';

import type { RealFiStakeActivity, RealFiWithdrawableUnstake } from '../../src';
import type { RealFiPosition, RealFiYieldInfo } from '../../src/store/types';
import type { RealFiStakeId } from '../../src/value-objects';
import type { Percent } from '@cardano-sdk/util';
import type { Milliseconds } from '@lace-lib/util';

const accountId = AccountId('acc-1');

const position = (overrides: Partial<RealFiPosition> = {}): RealFiPosition => ({
  positionId: RealFiPositionId(accountId),
  accountId,
  stakedSusdr: '1000',
  availableUsdr: '500',
  ...overrides,
});

describe('realfiFlow slice', () => {
  it('has Idle initial state', () => {
    const state = realfiStakingReducers.realfiFlow(undefined, {
      type: 'unknown',
    });
    expect(state).toEqual({ status: 'Idle' });
  });

  it('selectFlowState returns the flow state', () => {
    const state = realfiStakingReducers.realfiFlow(undefined, {
      type: 'unknown',
    });
    expect(
      realfiStakingSelectors.realfiFlow.selectFlowState({
        realfiFlow: state,
      }),
    ).toEqual({ status: 'Idle' });
  });
});

describe('realfiPosition slice', () => {
  const reducer = realfiStakingReducers.realfiPosition;
  const initial = reducer(undefined, { type: 'unknown' });

  it('has empty initial state', () => {
    expect(initial).toEqual({
      positionsByAccount: {},
      yieldInfoByNetwork: {},
      earnBasisRateByNetwork: {},
      stakeInputAssetsByNetwork: {},
      cooldownUnlockAtMsByNetwork: {},
      stakeActivitiesByAccount: {},
      withdrawnActivitiesByAccount: {},
      withdrawableByAccount: {},
      coolingDownByAccount: {},
      claimedTimelocksByAccount: {},
      submittedOrderTxsByAccount: {},
      hasSeenOnboarding: false,
      rPointsByAccount: {},
      rPointsFetchStatusByAccount: {},
      laceBonusConsumedByAccount: {},
    });
  });

  it('marks + selects the onboarding carousel as seen', () => {
    const selectors = realfiStakingSelectors.realfiPosition;
    expect(selectors.selectHasSeenOnboarding({ realfiPosition: initial })).toBe(
      false,
    );
    const seen = reducer(
      initial,
      realfiStakingActions.realfiPosition.onboardingShown(),
    );
    expect(selectors.selectHasSeenOnboarding({ realfiPosition: seen })).toBe(
      true,
    );
  });

  it('rPointsReceived stores the snapshot per account; selectAllRPoints exposes the map', () => {
    const selectors = realfiStakingSelectors.realfiPosition;
    expect(
      selectors.selectAllRPoints({ realfiPosition: initial } as never),
    ).toEqual({});
    const next = reducer(
      initial,
      realfiStakingActions.realfiPosition.rPointsReceived({
        accountId,
        rPoints: { totalPoints: 4120 },
      }),
    );
    const withSecond = reducer(
      next,
      realfiStakingActions.realfiPosition.rPointsReceived({
        accountId: AccountId('acc-other'),
        rPoints: { totalPoints: 880 },
      }),
    );
    expect(
      selectors.selectAllRPoints({ realfiPosition: withSecond } as never),
    ).toEqual({
      [accountId]: { totalPoints: 4120 },
      'acc-other': { totalPoints: 880 },
    });
  });

  it('rPointsRequested is an event-only action (no state change)', () => {
    const next = reducer(
      initial,
      realfiStakingActions.realfiPosition.rPointsRequested({ accountId }),
    );
    expect(next).toEqual(initial);
  });

  it('tracks the latest R-Points fetch result per account (api_status source)', () => {
    const selectors = realfiStakingSelectors.realfiPosition;
    expect(
      selectors.selectRPointsFetchStatusByAccount({
        realfiPosition: initial,
      } as never),
    ).toEqual({});
    const failed = reducer(
      initial,
      realfiStakingActions.realfiPosition.rPointsFetchFailed({ accountId }),
    );
    expect(
      selectors.selectRPointsFetchStatusByAccount({
        realfiPosition: failed,
      } as never),
    ).toEqual({ [accountId]: 'failure' });
    const recovered = reducer(
      failed,
      realfiStakingActions.realfiPosition.rPointsReceived({
        accountId,
        rPoints: { totalPoints: 4120 },
      }),
    );
    expect(
      selectors.selectRPointsFetchStatusByAccount({
        realfiPosition: recovered,
      } as never),
    ).toEqual({ [accountId]: 'success' });
  });

  it('transientAccountStateCleared drops the R-Points fetch results (network switch)', () => {
    const selectors = realfiStakingSelectors.realfiPosition;
    const failed = reducer(
      initial,
      realfiStakingActions.realfiPosition.rPointsFetchFailed({ accountId }),
    );
    const cleared = reducer(
      failed,
      realfiStakingActions.realfiPosition.transientAccountStateCleared(),
    );
    expect(
      selectors.selectRPointsFetchStatusByAccount({
        realfiPosition: cleared,
      } as never),
    ).toEqual({});
  });

  it('the Lace swap bonus is available until the history shows a swap order', () => {
    const selectors = realfiStakingSelectors.realfiPosition;
    const isAvailable = (state: typeof initial) =>
      selectors.selectIsLaceSwapBonusAvailableByAccountId(
        { realfiPosition: state },
        accountId,
      );

    // Non-swap history (a direct stake, an unstake) keeps the bonus available.
    const directStakeOnly = reducer(
      initial,
      realfiStakingActions.realfiPosition.stakeActivitiesReceived({
        accountId,
        activities: [
          { kind: 'stake' },
          { kind: 'unstake' },
        ] as RealFiStakeActivity[],
      }),
    );
    expect(isAvailable(directStakeOnly)).toBe(true);

    // Any swap(-into-USDr) order in the engine's history consumes it.
    const withSwap = reducer(
      initial,
      realfiStakingActions.realfiPosition.stakeActivitiesReceived({
        accountId,
        activities: [{ kind: 'swap' }] as RealFiStakeActivity[],
      }),
    );
    expect(isAvailable(withSwap)).toBe(false);

    // Each account is judged on its own history.
    const otherAccount = AccountId('acc-other');
    const bothAccounts = reducer(
      withSwap,
      realfiStakingActions.realfiPosition.stakeActivitiesReceived({
        accountId: otherAccount,
        activities: [{ kind: 'stake' }] as RealFiStakeActivity[],
      }),
    );
    expect(
      selectors.selectIsLaceSwapBonusAvailableByAccountId(
        { realfiPosition: bothAccounts },
        otherAccount,
      ),
    ).toBe(true);
  });

  it('the Lace swap bonus is unavailable until the order history has been read', () => {
    const selectors = realfiStakingSelectors.realfiPosition;
    // A restored or second-device wallet has no rows yet. Unread history must
    // not read as "no swaps ever": the engine grants the bonus by itself, so
    // withholding the callout is free, while promising a spent bonus is not.
    expect(
      selectors.selectIsLaceSwapBonusAvailableByAccountId(
        { realfiPosition: initial },
        accountId,
      ),
    ).toBe(false);

    // An empty history that HAS been read means the account truly has no
    // orders, so the bonus is genuinely available.
    const readAndEmpty = reducer(
      initial,
      realfiStakingActions.realfiPosition.stakeActivitiesReceived({
        accountId,
        activities: [],
      }),
    );
    expect(
      selectors.selectIsLaceSwapBonusAvailableByAccountId(
        { realfiPosition: readAndEmpty },
        accountId,
      ),
    ).toBe(true);
  });

  it('laceSwapBonusConsumed makes the bonus unavailable before the history catches up', () => {
    const selectors = realfiStakingSelectors.realfiPosition;
    const consumed = reducer(
      initial,
      realfiStakingActions.realfiPosition.laceSwapBonusConsumed({ accountId }),
    );
    expect(consumed.laceBonusConsumedByAccount[accountId]).toBe(true);
    expect(
      selectors.selectIsLaceSwapBonusAvailableByAccountId(
        { realfiPosition: consumed },
        accountId,
      ),
    ).toBe(false);
  });

  it('positionUpserted stores a position by account', () => {
    const next = reducer(
      initial,
      realfiStakingActions.realfiPosition.positionUpserted({
        position: position(),
      }),
    );
    expect(next.positionsByAccount[accountId]).toEqual(position());
  });

  it('positionsReceived replaces multiple positions', () => {
    const next = reducer(
      initial,
      realfiStakingActions.realfiPosition.positionsReceived({
        positions: [position(), position({ accountId: AccountId('acc-2') })],
      }),
    );
    expect(Object.keys(next.positionsByAccount)).toHaveLength(2);
  });

  it('pendingStakeAdded sets pendingStake on the position', () => {
    const seeded = reducer(
      initial,
      realfiStakingActions.realfiPosition.positionUpserted({
        position: position(),
      }),
    );
    const operation = {
      stakeId: 's1' as RealFiStakeId,
      kind: 'stake' as const,
      principalUsdr: '500',
      startedAt: 1 as Milliseconds,
      availableAt: 2 as Milliseconds,
    };
    const next = reducer(
      seeded,
      realfiStakingActions.realfiPosition.pendingStakeAdded({
        accountId,
        operation,
      }),
    );
    expect(next.positionsByAccount[accountId].pendingStake).toEqual(operation);
  });

  it('pendingOperationCleared clears the matching pending stake', () => {
    const operation = {
      stakeId: 's1' as RealFiStakeId,
      kind: 'stake' as const,
      principalUsdr: '500',
      startedAt: 1 as Milliseconds,
      availableAt: 2 as Milliseconds,
    };
    const seeded = reducer(
      initial,
      realfiStakingActions.realfiPosition.positionUpserted({
        position: position({ pendingStake: operation }),
      }),
    );
    const next = reducer(
      seeded,
      realfiStakingActions.realfiPosition.pendingOperationCleared({
        accountId,
        stakeId: 's1' as RealFiStakeId,
      }),
    );
    expect(next.positionsByAccount[accountId].pendingStake).toBeUndefined();
  });

  it('stakeInputAssetsReceived stores the verified list per network and replaces on refresh', () => {
    const seeded = reducer(
      initial,
      realfiStakingActions.realfiPosition.stakeInputAssetsReceived({
        realfiNetwork: 'preview',
        assets: ['ada.lovelace', 'deadbeef.55534443'],
      }),
    );
    expect(seeded.stakeInputAssetsByNetwork).toEqual({
      preview: ['ada.lovelace', 'deadbeef.55534443'],
    });
    const next = reducer(
      seeded,
      realfiStakingActions.realfiPosition.stakeInputAssetsReceived({
        realfiNetwork: 'preview',
        assets: ['deadbeef.55534443'],
      }),
    );
    expect(next.stakeInputAssetsByNetwork).toEqual({
      preview: ['deadbeef.55534443'],
    });
    expect(
      realfiStakingSelectors.realfiPosition.selectStakeInputAssetsByNetwork({
        realfiPosition: next,
      } as never),
    ).toEqual({ preview: ['deadbeef.55534443'] });
  });

  it('stakeInputAssetsRequested clears that network cached list so each visit re-runs discovery', () => {
    const seeded = reducer(
      reducer(
        initial,
        realfiStakingActions.realfiPosition.stakeInputAssetsReceived({
          realfiNetwork: 'preview',
          assets: ['deadbeef.55534443'],
        }),
      ),
      realfiStakingActions.realfiPosition.stakeInputAssetsReceived({
        realfiNetwork: 'preprod',
        assets: ['ada.lovelace', 'deadbeef.55534443'],
      }),
    );
    const next = reducer(
      seeded,
      realfiStakingActions.realfiPosition.stakeInputAssetsRequested({
        realfiNetwork: 'preview',
      }),
    );
    expect(next.stakeInputAssetsByNetwork).toEqual({
      preprod: ['ada.lovelace', 'deadbeef.55534443'],
    });
  });

  it('cooldownUnlockTimeReceived stores the boundary per network and replaces on refresh', () => {
    const seeded = reducer(
      initial,
      realfiStakingActions.realfiPosition.cooldownUnlockTimeReceived({
        realfiNetwork: 'preview',
        unlockAtMs: 1000,
      }),
    );
    expect(seeded.cooldownUnlockAtMsByNetwork).toEqual({ preview: 1000 });
    const next = reducer(
      seeded,
      realfiStakingActions.realfiPosition.cooldownUnlockTimeReceived({
        realfiNetwork: 'preview',
        unlockAtMs: 2000,
      }),
    );
    expect(next.cooldownUnlockAtMsByNetwork).toEqual({ preview: 2000 });
    expect(
      realfiStakingSelectors.realfiPosition.selectCooldownUnlockAtMsByNetwork({
        realfiPosition: next,
      } as never),
    ).toEqual({ preview: 2000 });
  });

  it('yieldInfoReceived caches yield info per network', () => {
    const yieldInfo: RealFiYieldInfo = {
      apy: 0.082 as Percent,
      exchangeRate: 1.05,
      fetchedAt: 1 as Milliseconds,
    };
    const next = reducer(
      initial,
      realfiStakingActions.realfiPosition.yieldInfoReceived({
        realfiNetwork: 'preprod',
        yieldInfo,
      }),
    );
    expect(next.yieldInfoByNetwork).toEqual({ preprod: yieldInfo });
  });

  it('yieldInfoReceived keeps a known APY when a refresh arrives without one (partial feed failure)', () => {
    const seeded = reducer(
      initial,
      realfiStakingActions.realfiPosition.yieldInfoReceived({
        realfiNetwork: 'preview',
        yieldInfo: {
          apy: 0.082 as Percent,
          exchangeRate: 1.05,
          fetchedAt: 1 as Milliseconds,
        },
      }),
    );
    const next = reducer(
      seeded,
      realfiStakingActions.realfiPosition.yieldInfoReceived({
        realfiNetwork: 'preview',
        yieldInfo: {
          apy: undefined,
          exchangeRate: 1.06,
          fetchedAt: 2 as Milliseconds,
        },
      }),
    );
    expect(next.yieldInfoByNetwork.preview).toEqual({
      apy: 0.082,
      exchangeRate: 1.06,
      fetchedAt: 2,
    });
  });

  it('yieldInfoReceived advances fetchedAt (not the rate) when the rate has not moved so the TTL resets', () => {
    const yieldInfo: RealFiYieldInfo = {
      apy: 0.082 as Percent,
      exchangeRate: 1.05,
      fetchedAt: 1 as Milliseconds,
    };
    const seeded = reducer(
      initial,
      realfiStakingActions.realfiPosition.yieldInfoReceived({
        realfiNetwork: 'preprod',
        yieldInfo,
      }),
    );
    const next = reducer(
      seeded,
      realfiStakingActions.realfiPosition.yieldInfoReceived({
        realfiNetwork: 'preprod',
        yieldInfo: { ...yieldInfo, fetchedAt: 2 as Milliseconds },
      }),
    );
    // Freshness must move (else makeYieldInfo's TTL never resets and every
    // request past the window refetches), but the displayed rate/apy stay put.
    expect(next.yieldInfoByNetwork.preprod).toEqual({
      apy: 0.082,
      exchangeRate: 1.05,
      fetchedAt: 2,
    });
  });

  it('yieldInfoReceived updates when the rate moves and keeps other networks', () => {
    const yieldInfo: RealFiYieldInfo = {
      apy: 0.082 as Percent,
      exchangeRate: 1.05,
      fetchedAt: 1 as Milliseconds,
    };
    const seeded = reducer(
      initial,
      realfiStakingActions.realfiPosition.yieldInfoReceived({
        realfiNetwork: 'preprod',
        yieldInfo,
      }),
    );
    const next = reducer(
      seeded,
      realfiStakingActions.realfiPosition.yieldInfoReceived({
        realfiNetwork: 'preview',
        yieldInfo: { ...yieldInfo, exchangeRate: 1.2 },
      }),
    );
    expect(next.yieldInfoByNetwork.preprod).toEqual(yieldInfo);
    expect(next.yieldInfoByNetwork.preview?.exchangeRate).toBe(1.2);
  });

  it('yieldInfoReceived captures the first-seen rate as the earn basis and keeps it', () => {
    const first: RealFiYieldInfo = {
      apy: 0.082 as Percent,
      exchangeRate: 1.05,
      fetchedAt: 1 as Milliseconds,
    };
    const afterFirst = reducer(
      initial,
      realfiStakingActions.realfiPosition.yieldInfoReceived({
        realfiNetwork: 'preview',
        yieldInfo: first,
      }),
    );
    expect(afterFirst.earnBasisRateByNetwork).toEqual({ preview: 1.05 });

    const afterSecond = reducer(
      afterFirst,
      realfiStakingActions.realfiPosition.yieldInfoReceived({
        realfiNetwork: 'preview',
        yieldInfo: {
          ...first,
          exchangeRate: 1.07,
          fetchedAt: 2 as Milliseconds,
        },
      }),
    );
    expect(afterSecond.earnBasisRateByNetwork).toEqual({ preview: 1.05 });
    expect(afterSecond.yieldInfoByNetwork.preview?.exchangeRate).toBe(1.07);
  });

  it('selectEarnedUsdPerSusdrByNetwork derives rate appreciation over the basis, floored at zero', () => {
    const base: RealFiYieldInfo = {
      apy: 0.082 as Percent,
      exchangeRate: 1.05,
      fetchedAt: 1 as Milliseconds,
    };
    let state = reducer(
      initial,
      realfiStakingActions.realfiPosition.yieldInfoReceived({
        realfiNetwork: 'preview',
        yieldInfo: base,
      }),
    );
    state = reducer(
      state,
      realfiStakingActions.realfiPosition.yieldInfoReceived({
        realfiNetwork: 'preview',
        yieldInfo: {
          ...base,
          exchangeRate: 1.07,
          fetchedAt: 2 as Milliseconds,
        },
      }),
    );
    // A second network that never moved earns zero; a rate below the basis
    // (defensive) must clamp to zero rather than show negative earnings.
    state = reducer(
      state,
      realfiStakingActions.realfiPosition.yieldInfoReceived({
        realfiNetwork: 'preprod',
        yieldInfo: { ...base, exchangeRate: 1.1, fetchedAt: 1 as Milliseconds },
      }),
    );
    const earned =
      realfiStakingSelectors.realfiPosition.selectEarnedUsdPerSusdrByNetwork({
        realfiPosition: state,
      });
    expect(earned.preview).toBeCloseTo(0.02, 10);
    expect(earned.preprod).toBe(0);
  });

  it('withdrawSucceeded stores the claim summary for the success sheet; a new request or explicit clear removes it', () => {
    const succeeded = reducer(
      initial,
      realfiStakingActions.realfiPosition.withdrawSucceeded({
        accountId,
        amountUsdr: '1500000',
      }),
    );
    expect(
      realfiStakingSelectors.realfiPosition.selectWithdrawSuccess({
        realfiPosition: succeeded,
      }),
    ).toEqual({ accountId, amountUsdr: '1500000' });

    const cleared = reducer(
      succeeded,
      realfiStakingActions.realfiPosition.withdrawSuccessCleared(),
    );
    expect(cleared.withdrawSuccess).toBeUndefined();

    const superseded = reducer(
      succeeded,
      realfiStakingActions.realfiPosition.withdrawRequested({
        accountId,
        unstakes: [],
      }),
    );
    expect(superseded.withdrawSuccess).toBeUndefined();
  });

  it('withdrawFeeQuoteReceived stores the built fee; a new request clears the stale quote', () => {
    const quoted = reducer(
      initial,
      realfiStakingActions.realfiPosition.withdrawFeeQuoteReceived({
        feeLovelace: '176000',
        unsignedTxCbor: 'quoted-cbor',
        timelockKey: 'tl#0',
        quotedAt: 1,
      }),
    );
    expect(
      realfiStakingSelectors.realfiPosition.selectWithdrawFeeLovelace({
        realfiPosition: quoted,
      }),
    ).toBe('176000');

    const cleared = reducer(
      quoted,
      realfiStakingActions.realfiPosition.withdrawFeeQuoteRequested({
        accountId,
        unstakes: [],
      }),
    );
    expect(cleared.withdrawFeeQuote).toBeUndefined();
  });

  it('selectPendingUnstakeTotalBaseUnits sums cooldown + withdrawable across accounts', () => {
    const otherAccountId = AccountId('acc-2');
    let state = reducer(
      initial,
      realfiStakingActions.realfiPosition.withdrawableReceived({
        accountId,
        unstakes: [
          {
            timelockUtxo: { txHash: 'tx-1', index: 0 },
            unlockSlot: 123,
            usdrAmount: '1500000',
          },
        ],
      }),
    );
    state = reducer(
      state,
      realfiStakingActions.realfiPosition.coolingDownReceived({
        accountId,
        unstakes: [
          { unlockSlot: 456, claimableAtMs: 1, usdrAmount: '2000000' },
        ],
      }),
    );
    state = reducer(
      state,
      realfiStakingActions.realfiPosition.coolingDownReceived({
        accountId: otherAccountId,
        unstakes: [{ unlockSlot: 789, claimableAtMs: 2, usdrAmount: '250' }],
      }),
    );
    const selectors = realfiStakingSelectors.realfiPosition;
    expect(
      selectors.selectPendingUnstakeTotalBaseUnits({ realfiPosition: state }),
    ).toBe('3500250');
    expect(
      selectors.selectPendingUnstakeTotalBaseUnits({ realfiPosition: initial }),
    ).toBe('0');
  });

  it('selectAllPositions / selectYieldInfo read state', () => {
    const seeded = reducer(
      initial,
      realfiStakingActions.realfiPosition.positionUpserted({
        position: position(),
      }),
    );
    const root = { realfiPosition: seeded };
    expect(
      realfiStakingSelectors.realfiPosition.selectAllPositions(root),
    ).toEqual({ [accountId]: position() });
    expect(
      realfiStakingSelectors.realfiPosition.selectYieldInfo(root, 'preprod'),
    ).toBeUndefined();
  });

  it('parameterized selectors read per-account data', () => {
    const seeded = reducer(
      initial,
      realfiStakingActions.realfiPosition.positionUpserted({
        position: position({ stakedSusdr: '777', claimableAda: '42' }),
      }),
    );
    const root = { realfiPosition: seeded };
    expect(
      realfiStakingSelectors.realfiPosition.selectPositionByAccountId(
        root,
        accountId,
      ),
    ).toMatchObject({ stakedSusdr: '777' });
    expect(
      realfiStakingSelectors.realfiPosition.selectStakedSusdrByAccountId(
        root,
        accountId,
      ),
    ).toBe('777');
    expect(
      realfiStakingSelectors.realfiPosition.selectClaimableAdaByAccountId(
        root,
        accountId,
      ),
    ).toBe('42');
    expect(
      realfiStakingSelectors.realfiPosition.selectStakedSusdrByAccountId(
        root,
        AccountId('missing'),
      ),
    ).toBe('0');
  });

  it('stores + selects staking activities and withdrawable unstakes per account', () => {
    const activity: RealFiStakeActivity = {
      id: 'tx-1',
      kind: 'unstake',
      label: 'Unstake',
      subtitle: '-100 sUSDrf',
      completed: true,
      requestDate: 1_700_000_000_000,
      steps: [{ key: 'unstake', status: 'completed' }],
    };
    const withdrawableUnstake: RealFiWithdrawableUnstake = {
      timelockUtxo: { txHash: 'tx-1', index: 0 },
      unlockSlot: 123,
      usdrAmount: '100',
    };
    const withActivities = reducer(
      initial,
      realfiStakingActions.realfiPosition.stakeActivitiesReceived({
        accountId,
        activities: [activity],
      }),
    );
    const seeded = reducer(
      withActivities,
      realfiStakingActions.realfiPosition.withdrawableReceived({
        accountId,
        unstakes: [withdrawableUnstake],
      }),
    );
    const root = { realfiPosition: seeded };
    const selectors = realfiStakingSelectors.realfiPosition;

    expect(selectors.selectStakeActivitiesByAccountId(root, accountId)).toEqual(
      [activity],
    );
    expect(selectors.selectWithdrawableByAccountId(root, accountId)).toEqual([
      withdrawableUnstake,
    ]);
    expect(
      selectors.selectStakeActivityById(root, {
        accountId,
        activityId: 'tx-1',
      }),
    ).toEqual(activity);

    // Missing account / id → stable empty list + undefined (reselect stability).
    const emptyRoot = { realfiPosition: initial };
    expect(
      selectors.selectStakeActivitiesByAccountId(
        emptyRoot,
        AccountId('missing'),
      ),
    ).toEqual([]);
    expect(
      selectors.selectStakeActivityById(root, {
        accountId,
        activityId: 'nope',
      }),
    ).toBeUndefined();
  });

  it('selectCombinedStakeActivities merges every account newest-first, tagging each row', () => {
    const otherAccountId = AccountId('other-wallet-0-1');
    const older: RealFiStakeActivity = {
      id: 'tx-old',
      kind: 'stake',
      label: 'Stake',
      subtitle: '-100 USDrf',
      completed: true,
      requestDate: 1_700_000_000_000,
      steps: [{ key: 'stake', status: 'completed' }],
    };
    const newer: RealFiStakeActivity = {
      id: 'tx-new',
      kind: 'unstake',
      label: 'Unstake',
      subtitle: '-50 sUSDrf',
      completed: true,
      requestDate: 1_700_000_100_000,
      steps: [{ key: 'unstake', status: 'completed' }],
    };
    const seeded = reducer(
      reducer(
        initial,
        realfiStakingActions.realfiPosition.stakeActivitiesReceived({
          accountId,
          activities: [older],
        }),
      ),
      realfiStakingActions.realfiPosition.stakeActivitiesReceived({
        accountId: otherAccountId,
        activities: [newer],
      }),
    );
    const root = { realfiPosition: seeded };

    expect(
      realfiStakingSelectors.realfiPosition.selectCombinedStakeActivities(root),
    ).toEqual([
      { ...newer, accountId: otherAccountId },
      { ...older, accountId },
    ]);
  });

  it('withdrawableCleared removes only the claimed timelocks', () => {
    const claimed: RealFiWithdrawableUnstake = {
      timelockUtxo: { txHash: 'tx-1', index: 0 },
      unlockSlot: 123,
      usdrAmount: '100',
    };
    const remaining: RealFiWithdrawableUnstake = {
      timelockUtxo: { txHash: 'tx-2', index: 1 },
      unlockSlot: 456,
      usdrAmount: '200',
    };
    const seeded = reducer(
      initial,
      realfiStakingActions.realfiPosition.withdrawableReceived({
        accountId,
        unstakes: [claimed, remaining],
      }),
    );
    const next = reducer(
      seeded,
      realfiStakingActions.realfiPosition.withdrawableCleared({
        accountId,
        timelockUtxos: [claimed.timelockUtxo],
        clearedAtMs: 1_000,
      }),
    );
    expect(next.withdrawableByAccount[accountId]).toEqual([remaining]);
    // The claim is tombstoned so a stale read can't resurrect it.
    expect(next.claimedTimelocksByAccount[accountId]).toEqual([
      { key: 'tx-1#0', clearedAtMs: 1_000 },
    ]);

    // Clearing before any read still records the tombstone — the FIRST read
    // after the claim must already be filtered.
    const clearedFirst = reducer(
      initial,
      realfiStakingActions.realfiPosition.withdrawableCleared({
        accountId,
        timelockUtxos: [claimed.timelockUtxo],
        clearedAtMs: 1_000,
      }),
    );
    expect(clearedFirst.withdrawableByAccount).toEqual({});
    expect(clearedFirst.claimedTimelocksByAccount[accountId]).toEqual([
      { key: 'tx-1#0', clearedAtMs: 1_000 },
    ]);
  });

  it('a stale read cannot resurrect a just-claimed timelock (banner stays gone)', () => {
    const claimed: RealFiWithdrawableUnstake = {
      timelockUtxo: { txHash: 'tx-1', index: 0 },
      unlockSlot: 123,
      usdrAmount: '100',
    };
    const remaining: RealFiWithdrawableUnstake = {
      timelockUtxo: { txHash: 'tx-2', index: 1 },
      unlockSlot: 456,
      usdrAmount: '200',
    };
    const cleared = reducer(
      reducer(
        initial,
        realfiStakingActions.realfiPosition.withdrawableReceived({
          accountId,
          unstakes: [claimed, remaining],
        }),
      ),
      realfiStakingActions.realfiPosition.withdrawableCleared({
        accountId,
        timelockUtxos: [claimed.timelockUtxo],
        clearedAtMs: 1_000,
      }),
    );

    // The backend still returns the claimed timelock as unspent (mempool
    // window) — the refreshed list keeps it out, other claims update.
    const stale = reducer(
      cleared,
      realfiStakingActions.realfiPosition.withdrawableReceived({
        accountId,
        unstakes: [claimed, remaining],
        receivedAtMs: 2_000,
      }),
    );
    expect(stale.withdrawableByAccount[accountId]).toEqual([remaining]);
    expect(stale.claimedTimelocksByAccount[accountId]).toEqual([
      { key: 'tx-1#0', clearedAtMs: 1_000 },
    ]);

    // The backend caught up (claim tx confirmed) — the tombstone is done.
    const caughtUp = reducer(
      stale,
      realfiStakingActions.realfiPosition.withdrawableReceived({
        accountId,
        unstakes: [remaining],
        receivedAtMs: 3_000,
      }),
    );
    expect(caughtUp.withdrawableByAccount[accountId]).toEqual([remaining]);
    expect(caughtUp.claimedTimelocksByAccount[accountId]).toEqual([]);
  });

  it('an expired tombstone lets a stuck claim resurface for retry', () => {
    const claimed: RealFiWithdrawableUnstake = {
      timelockUtxo: { txHash: 'tx-1', index: 0 },
      unlockSlot: 123,
      usdrAmount: '100',
    };
    const cleared = reducer(
      initial,
      realfiStakingActions.realfiPosition.withdrawableCleared({
        accountId,
        timelockUtxos: [claimed.timelockUtxo],
        clearedAtMs: 1_000,
      }),
    );
    // 10 minutes on, the read still returns the timelock — the claim tx never
    // landed, so the claim comes back rather than staying hidden forever.
    const resurfaced = reducer(
      cleared,
      realfiStakingActions.realfiPosition.withdrawableReceived({
        accountId,
        unstakes: [claimed],
        receivedAtMs: 1_000 + 10 * 60_000,
      }),
    );
    expect(resurfaced.withdrawableByAccount[accountId]).toEqual([claimed]);
    expect(resurfaced.claimedTimelocksByAccount[accountId]).toEqual([]);
  });

  it('transientAccountStateCleared drops the claim tombstones with the lists they guard', () => {
    const cleared = reducer(
      reducer(
        initial,
        realfiStakingActions.realfiPosition.withdrawableCleared({
          accountId,
          timelockUtxos: [{ txHash: 'tx-1', index: 0 }],
          clearedAtMs: 1_000,
        }),
      ),
      realfiStakingActions.realfiPosition.transientAccountStateCleared(),
    );
    expect(cleared.claimedTimelocksByAccount).toEqual({});
  });

  it('tracks a claim in flight from request until it settles (success / failure / declined)', () => {
    const request = {
      accountId,
      unstakes: [
        {
          timelockUtxo: { txHash: 'tl', index: 0 },
          unlockSlot: 1,
          usdrAmount: '100',
        },
      ],
    };
    const selectInFlight = (state: typeof initial) =>
      realfiStakingSelectors.realfiPosition.selectWithdrawInFlight({
        realfiPosition: state,
      } as never);
    expect(selectInFlight(initial)).toBe(false);
    const requested = reducer(
      initial,
      realfiStakingActions.realfiPosition.withdrawRequested(request),
    );
    expect(selectInFlight(requested)).toBe(true);
    expect(
      selectInFlight(
        reducer(
          requested,
          realfiStakingActions.realfiPosition.withdrawSucceeded({
            accountId,
            amountUsdr: '100',
          }),
        ),
      ),
    ).toBe(false);
    expect(
      selectInFlight(
        reducer(
          requested,
          realfiStakingActions.realfiPosition.withdrawFailed(request),
        ),
      ),
    ).toBe(false);
    expect(
      selectInFlight(
        reducer(
          requested,
          realfiStakingActions.realfiPosition.withdrawDeclined(),
        ),
      ),
    ).toBe(false);
  });

  it('transientAccountStateCleared evicts the per-account reads but keeps persisted state', () => {
    const unstake = {
      timelockUtxo: { txHash: 'tl', index: 0 },
      unlockSlot: 1,
      usdrAmount: '100',
    };
    let state = reducer(
      initial,
      realfiStakingActions.realfiPosition.withdrawableReceived({
        accountId,
        unstakes: [unstake],
      }),
    );
    const withdrawnRow = {
      id: 'tl#0-withdraw',
      kind: 'withdraw',
      label: 'Withdrawal',
      subtitle: '+1.00 USDrf',
      completed: true,
      requestDate: 1,
      steps: [],
    } as never;
    state = reducer(
      state,
      realfiStakingActions.realfiPosition.withdrawActivitiesRecorded({
        accountId,
        activities: [withdrawnRow],
      }),
    );
    const stakeRow = {
      id: 'stake-1',
      kind: 'stake',
      label: 'Stake',
      subtitle: '-5.00 USDrf',
      completed: true,
      requestDate: 2,
      steps: [],
    } as never;
    state = reducer(
      state,
      realfiStakingActions.realfiPosition.stakeActivitiesReceived({
        accountId,
        activities: [stakeRow],
      }),
    );
    state = reducer(
      state,
      realfiStakingActions.realfiPosition.transientAccountStateCleared(),
    );
    expect(state.withdrawableByAccount).toEqual({});
    expect(state.coolingDownByAccount).toEqual({});
    // Persisted maps survive — a network switch must not delete claim history
    // or the staking-activities list (both rehydrate the screen on return).
    expect(state.stakeActivitiesByAccount).toEqual({ [accountId]: [stakeRow] });
    expect(state.withdrawnActivitiesByAccount).toEqual({
      [accountId]: [withdrawnRow],
    });
  });

  it('withdrawFailed stores the failed claim for the error sheet retry', () => {
    const failed: RealFiWithdrawableUnstake = {
      timelockUtxo: { txHash: 'tx-f', index: 0 },
      unlockSlot: 111,
      usdrAmount: '300',
    };
    const next = reducer(
      initial,
      realfiStakingActions.realfiPosition.withdrawFailed({
        accountId,
        unstakes: [failed],
      }),
    );
    expect(
      realfiStakingSelectors.realfiPosition.selectWithdrawFailure({
        realfiPosition: next,
      }),
    ).toEqual({ accountId, unstakes: [failed] });
  });

  it('withdrawFailureCleared and a retry withdrawRequested both clear the failure', () => {
    const failed: RealFiWithdrawableUnstake = {
      timelockUtxo: { txHash: 'tx-f', index: 0 },
      unlockSlot: 111,
      usdrAmount: '300',
    };
    const failedState = reducer(
      initial,
      realfiStakingActions.realfiPosition.withdrawFailed({
        accountId,
        unstakes: [failed],
      }),
    );
    expect(
      reducer(
        failedState,
        realfiStakingActions.realfiPosition.withdrawFailureCleared(),
      ).withdrawFailure,
    ).toBeUndefined();
    expect(
      reducer(
        failedState,
        realfiStakingActions.realfiPosition.withdrawRequested({
          accountId,
          unstakes: [failed],
        }),
      ).withdrawFailure,
    ).toBeUndefined();
  });

  it('merges optimistically-recorded withdrawals into the activity list', () => {
    const unstake: RealFiStakeActivity = {
      id: 'unstake-tx',
      kind: 'unstake',
      label: 'Unstake',
      subtitle: '-100 sUSDrf',
      completed: true,
      requestDate: 1_700_000_000_000,
      steps: [{ key: 'unstake', status: 'completed' }],
    };
    const withdrawal: RealFiStakeActivity = {
      id: 'timelock-tx#0-withdraw',
      kind: 'withdraw',
      label: 'Withdraw',
      subtitle: '+100 USDrf',
      completed: true,
      requestDate: 1_700_000_100_000,
      steps: [{ key: 'received', status: 'completed' }],
    };
    const withRead = reducer(
      initial,
      realfiStakingActions.realfiPosition.stakeActivitiesReceived({
        accountId,
        activities: [unstake],
      }),
    );
    const recorded = reducer(
      withRead,
      realfiStakingActions.realfiPosition.withdrawActivitiesRecorded({
        accountId,
        activities: [withdrawal],
      }),
    );
    const selectors = realfiStakingSelectors.realfiPosition;
    const root = { realfiPosition: recorded };

    // The read list is unchanged; the merged selector adds the withdraw row
    // (newest-first) and finds it by id.
    expect(selectors.selectAllStakeActivities(root)[accountId]).toEqual([
      unstake,
    ]);
    expect(selectors.selectStakeActivitiesByAccountId(root, accountId)).toEqual(
      [withdrawal, unstake],
    );
    expect(
      selectors.selectStakeActivityById(root, {
        accountId,
        activityId: withdrawal.id,
      }),
    ).toEqual(withdrawal);

    // Recording the same withdrawal again is a no-op (deduped by id).
    const again = reducer(
      recorded,
      realfiStakingActions.realfiPosition.withdrawActivitiesRecorded({
        accountId,
        activities: [withdrawal],
      }),
    );
    expect(again.withdrawnActivitiesByAccount[accountId]).toHaveLength(1);
  });

  describe('submitted order txs (feed-mismatch tracking)', () => {
    const reducer = realfiStakingReducers.realfiPosition;
    const initial = reducer(undefined, { type: 'unknown' });
    const selectors = realfiStakingSelectors.realfiPosition;
    const nowMs = 1_700_000_000_000;
    const orderTx = (overrides = {}) => ({
      txHash: 'order-tx-1',
      recordedAt: nowMs,
      kind: 'unstake' as const,
      inputTokenId: 'susdr-token',
      ...overrides,
    });

    it('records a submitted order tx per account and selects the map', () => {
      const recorded = reducer(
        initial,
        realfiStakingActions.realfiPosition.submittedOrderTxRecorded({
          accountId,
          orderTx: orderTx(),
        }),
      );
      expect(
        selectors.selectSubmittedOrderTxsByAccount({
          realfiPosition: recorded,
        }),
      ).toEqual({ [accountId]: [orderTx()] });
    });

    it('evicts records past the max age when a new one is recorded', () => {
      const ancient = orderTx({
        txHash: 'order-tx-old',
        recordedAt: nowMs - 8 * 24 * 60 * 60_000,
      });
      const seeded = reducer(
        initial,
        realfiStakingActions.realfiPosition.submittedOrderTxRecorded({
          accountId,
          orderTx: ancient,
        }),
      );
      const recorded = reducer(
        seeded,
        realfiStakingActions.realfiPosition.submittedOrderTxRecorded({
          accountId,
          orderTx: orderTx(),
        }),
      );
      expect(recorded.submittedOrderTxsByAccount[accountId]).toEqual([
        orderTx(),
      ]);
    });

    it('stakeActivitiesReceived clears records the feed now returns, keeps the rest', () => {
      const seen = orderTx();
      const unseen = orderTx({ txHash: 'order-tx-2' });
      const otherAccount = AccountId('other-acc');
      let state = initial;
      for (const [account, tx] of [
        [accountId, seen],
        [accountId, unseen],
        [otherAccount, orderTx({ txHash: 'order-tx-3' })],
      ] as const) {
        state = reducer(
          state,
          realfiStakingActions.realfiPosition.submittedOrderTxRecorded({
            accountId: account,
            orderTx: tx,
          }),
        );
      }
      const received = reducer(
        state,
        realfiStakingActions.realfiPosition.stakeActivitiesReceived({
          accountId,
          activities: [
            {
              id: seen.txHash,
              kind: 'unstake',
              label: 'Unstake',
              subtitle: '-50 sUSDrf',
              completed: false,
              requestDate: nowMs,
              steps: [{ key: 'unstake', status: 'active' }],
            },
          ],
        }),
      );
      // The feed knows `seen` → cleared; `unseen` stays; other accounts untouched.
      expect(received.submittedOrderTxsByAccount).toEqual({
        [accountId]: [unseen],
        [otherAccount]: [orderTx({ txHash: 'order-tx-3' })],
      });
    });

    it('stakeActivitiesReceived drops the account key once its last record clears', () => {
      const seeded = reducer(
        initial,
        realfiStakingActions.realfiPosition.submittedOrderTxRecorded({
          accountId,
          orderTx: orderTx(),
        }),
      );
      const received = reducer(
        seeded,
        realfiStakingActions.realfiPosition.stakeActivitiesReceived({
          accountId,
          activities: [
            {
              id: orderTx().txHash,
              kind: 'unstake',
              label: 'Unstake',
              subtitle: '-50 sUSDrf',
              completed: true,
              requestDate: nowMs,
              steps: [{ key: 'unstake', status: 'completed' }],
            },
          ],
        }),
      );
      expect(received.submittedOrderTxsByAccount).toEqual({});
    });
  });
});
