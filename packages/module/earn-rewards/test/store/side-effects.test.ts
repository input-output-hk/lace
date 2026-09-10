import { Cardano } from '@cardano-sdk/core';
import {
  EARN_REWARDS_POOL_SELECTION_PREFIX,
  FEATURE_FLAG_EARN_REWARDS,
} from '@lace-contract/earn-rewards';
import { FEATURE_FLAG_GOVERNANCE_CENTER } from '@lace-contract/governance-center';
import { FEATURE_FLAG_STAKING_CENTER } from '@lace-contract/staking-center';
import { SheetRoutes } from '@lace-lib/navigation';
import { firstValueFrom, of, timeout, TimeoutError, toArray } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makePoolSelectionConsumption } from '../../src/store/side-effects';

import type { PoolSelection } from '@lace-contract/cardano-stake-pools';
import type { FeatureFlag } from '@lace-contract/feature';

// Full replacement, not importOriginal: the real barrel pulls native sheet
// internals that do not resolve under node.
vi.mock('@lace-lib/navigation', () => ({
  SheetRoutes: { EarnRewards: 'EarnRewards', BrowsePool: 'BrowsePool' },
}));

const POOL = 'pool132jxjzyw4awr3s75ltcdx5tv5ecv6m042306l630wqjckhfm32r';
const PICKED_POOL = Cardano.PoolId(
  'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
);
const DREP = 'drep1y2v8w544v5teexvycd6zqgh2686yz7050tdv834yegpt0gsnampev';

const flags = ({ withPool = false } = {}): FeatureFlag[] =>
  [
    { key: FEATURE_FLAG_EARN_REWARDS },
    {
      key: FEATURE_FLAG_GOVERNANCE_CENTER,
      payload: { promotedDreps: { preprod: [{ id: DREP }] } },
    },
    ...(withPool
      ? [
          {
            key: FEATURE_FLAG_STAKING_CENTER,
            payload: { promotedPools: { preprod: [{ id: POOL }] } },
          },
        ]
      : []),
  ] as FeatureFlag[];

const selection = (selectionId: string): PoolSelection => ({
  selectionId,
  poolId: PICKED_POOL,
  ticker: 'PICK',
  poolName: 'Picked Pool',
  ros: 0.031,
});

const actions = {
  earnRewardsFlow: {
    reset: vi.fn(() => ({ type: 'earnRewardsFlow/reset' })),
    feeCalculationRequested: vi.fn((payload: unknown) => ({
      type: 'earnRewardsFlow/feeCalculationRequested',
      payload,
    })),
  },
  cardanoStakePools: {
    poolSelectionCleared: vi.fn((payload: unknown) => ({
      type: 'cardanoStakePools/poolSelectionCleared',
      payload,
    })),
  },
  views: {
    setActiveSheetPage: vi.fn((payload: unknown) => ({
      type: 'views/setActiveSheetPage',
      payload,
    })),
  },
} as never;

const run = async ({
  poolSelection,
  flowStatus = 'Idle',
  featureFlags = flags(),
  rewardAccountInfo,
}: {
  poolSelection: PoolSelection | undefined;
  flowStatus?: string;
  featureFlags?: FeatureFlag[];
  /** The picked-for account's on-chain state; absent models info not loaded. */
  rewardAccountInfo?: { poolId?: string; drepId?: string };
}): Promise<{ type: string; payload?: unknown }[]> =>
  firstValueFrom(
    makePoolSelectionConsumption()(
      {} as never,
      {
        cardanoStakePools: { selectPoolSelection$: of(poolSelection) },
        earnRewardsFlow: {
          selectEarnRewardsFlowState$: of({ status: flowStatus }),
        },
        features: { selectLoadedFeatures$: of({ featureFlags }) },
        cardanoContext: {
          selectChainId$: of(Cardano.ChainIds.Preprod),
          selectRewardAccountDetails$: of(
            rewardAccountInfo === undefined
              ? {}
              : { 'acc-1': { rewardAccountInfo } },
          ),
        },
      } as never,
      { actions } as never,
    ).pipe(timeout({ first: 50 }), toArray()),
  ).catch((error: unknown) => {
    // A timeout means the effect (correctly) emitted nothing for this input.
    // Anything else — a throwing constructor, broken selector wiring — must
    // fail the test, not read as "emitted nothing".
    if (error instanceof TimeoutError)
      return [] as { type: string; payload?: unknown }[];
    throw error;
  });

describe('makePoolSelectionConsumption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts the fee calculation with the picked pool and the promoted DRep, and re-presents the sheet', async () => {
    const emitted = await run({
      poolSelection: selection(`${EARN_REWARDS_POOL_SELECTION_PREFIX}acc-1`),
    });

    expect(emitted.map(action => action.type)).toEqual([
      'views/setActiveSheetPage',
      'earnRewardsFlow/feeCalculationRequested',
    ]);
    /**
     * Through the views store rather than `NavigationControls`: on the
     * extension the store runs in the service worker, where the navigation ref
     * is never set, so a direct call is silently dropped — the pick was
     * consumed and the user saw nothing. `requestId` is what makes a second
     * pick for the same account observable to the UI replica.
     */
    expect(emitted[0].payload).toEqual({
      route: SheetRoutes.EarnRewards,
      params: { accountId: 'acc-1' },
      requestId: 0,
    });
    const payload = emitted[1].payload as {
      accountId: string;
      poolId: string;
      dRep?: { drepId: string };
    };
    expect(payload.accountId).toBe('acc-1');
    expect(payload.poolId).toBe(PICKED_POOL);
    expect(payload.dRep?.drepId).toBe(Cardano.DRepID(DREP));
  });

  /**
   * The last check before a transaction is priced — callers' mode computations
   * are not trusted here. The done screen's recovery button reached this with
   * an account the same migration had already delegated: the pick started the
   * flow before the sheet mounted, so the sheet's Idle-gated moot guard never
   * ran, and the priced transaction would have MOVED that delegation.
   */
  it('discards a pick for an account that already has a DRep', async () => {
    const emitted = await run({
      poolSelection: selection(`${EARN_REWARDS_POOL_SELECTION_PREFIX}acc-1`),
      rewardAccountInfo: { poolId: 'pool1theirs', drepId: `${DREP}` },
    });

    expect(emitted.map(action => action.type)).toEqual([
      'cardanoStakePools/poolSelectionCleared',
    ]);
  });

  it('hands an already-staking account to the sheet instead of spending the pick', async () => {
    const emitted = await run({
      poolSelection: selection(`${EARN_REWARDS_POOL_SELECTION_PREFIX}acc-1`),
      rewardAccountInfo: { poolId: 'pool1theirs' },
    });

    // The sheet mounts Idle and runs the vote-only offer itself; starting the
    // flow here with the picked pool would delegate away the account's own.
    expect(emitted.map(action => action.type)).toEqual([
      'cardanoStakePools/poolSelectionCleared',
      'views/setActiveSheetPage',
    ]);
  });

  it("ignores another flow's selection", async () => {
    const emitted = await run({
      poolSelection: selection('migrate-wallet'),
    });
    expect(emitted).toHaveLength(0);
  });

  // Cleared, not merely ignored: state observables never re-emit an unchanged
  // value, so a rejected selection left in the slot can only mislead a later
  // read — it will never be consumed.
  // A flow the user has already confirmed is in the air: starting a second
  // would double-submit.
  it.each(['AwaitingConfirmation', 'Processing'])(
    'clears a selection arriving while the flow is %s',
    async flowStatus => {
      const emitted = await run({
        poolSelection: selection(`${EARN_REWARDS_POOL_SELECTION_PREFIX}acc-1`),
        flowStatus,
      });
      expect(emitted.map(action => action.type)).toEqual([
        'cardanoStakePools/poolSelectionCleared',
      ]);
    },
  );

  /**
   * The dead end this closes. With no promoted pool the entry points open the
   * picker DIRECTLY, so no sheet mounts to clear the residue of an earlier run
   * — a dismissed signing prompt, say. Rejecting on that residue meant the user
   * picked a pool and nothing happened, with the pick cleared behind them.
   */
  it.each(['Error', 'Success'])(
    'starts a new run from a settled %s flow, resetting it first',
    async flowStatus => {
      const emitted = await run({
        poolSelection: selection(`${EARN_REWARDS_POOL_SELECTION_PREFIX}acc-1`),
        flowStatus,
      });
      expect(emitted.map(action => action.type)).toEqual([
        'earnRewardsFlow/reset',
        'views/setActiveSheetPage',
        'earnRewardsFlow/feeCalculationRequested',
      ]);
    },
  );

  /**
   * With a promoted pool configured no selection was ever offered, so a
   * matching id is stale state from an older run — never an instruction. Acting
   * on it would delegate to a pool the CURRENT offer does not present.
   */
  it('clears a selection when the target has a promoted pool', async () => {
    const emitted = await run({
      poolSelection: selection(`${EARN_REWARDS_POOL_SELECTION_PREFIX}acc-1`),
      featureFlags: flags({ withPool: true }),
    });
    expect(emitted.map(action => action.type)).toEqual([
      'cardanoStakePools/poolSelectionCleared',
    ]);
    expect(emitted[0].payload).toEqual({
      selectionId: `${EARN_REWARDS_POOL_SELECTION_PREFIX}acc-1`,
    });
  });

  it('clears a selection when no target resolves at all', async () => {
    const emitted = await run({
      poolSelection: selection(`${EARN_REWARDS_POOL_SELECTION_PREFIX}acc-1`),
      featureFlags: [],
    });
    expect(emitted.map(action => action.type)).toEqual([
      'cardanoStakePools/poolSelectionCleared',
    ]);
  });
});
