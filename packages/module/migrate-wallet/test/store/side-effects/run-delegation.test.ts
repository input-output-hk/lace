import { Cardano } from '@cardano-sdk/core';
import { FEATURE_FLAG_EARN_REWARDS } from '@lace-contract/earn-rewards';
import { FEATURE_FLAG_GOVERNANCE_CENTER } from '@lace-contract/governance-center';
import { FEATURE_FLAG_STAKING_CENTER } from '@lace-contract/staking-center';
import { AccountId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { defer, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  completeTargetWithChosenPool,
  delegationPlan,
  makeRunDelegation,
} from '../../../src/store/side-effects/run-delegation';
import { migrateWalletActions } from '../../../src/store/slice';

import type { EarnRewardsTarget } from '@lace-contract/earn-rewards';
import type { FeatureFlag } from '@lace-contract/feature';
import type { RunHelpers } from 'rxjs/testing';

const POOL = Cardano.PoolId(
  'pool132jxjzyw4awr3s75ltcdx5tv5ecv6m042306l630wqjckhfm32r',
);
/** Where a source account already staked, distinct from the target's pool. */
const PRESERVED = Cardano.PoolId(
  'pool106jtt06k5wjpqc5r5fkz06pgwhwaljzs624mnfua8fkhq0fl9am',
);
const DREP = 'drep1y2v8w544v5teexvycd6zqgh2686yz7050tdv834yegpt0gsnampev';
const destinationAccountId = AccountId('destination-account');
const chainId = Cardano.ChainIds.Preprod;

const featureFlags = [
  { key: FEATURE_FLAG_EARN_REWARDS },
  {
    key: FEATURE_FLAG_STAKING_CENTER,
    payload: { promotedPools: { preprod: [{ id: `${POOL}` }] } },
  },
  {
    key: FEATURE_FLAG_GOVERNANCE_CENTER,
    payload: { promotedDreps: { preprod: [{ id: DREP }] } },
  },
] as FeatureFlag[];

const target: EarnRewardsTarget = {
  poolId: POOL,
  dRep: { type: 'specific', drepId: Cardano.DRepID(DREP) },
};

/** An output the sweep itself created — what the settlement gate anchors on. */
const utxo = [{ txId: 'sweep1' }, { value: { coins: 5_000_000n } }] as never;
/** Funds the destination held before the migration; must not open the gate. */
const preexistingUtxo = [
  { txId: 'preexisting' },
  { value: { coins: 5_000_000n } },
] as never;

const upsertActivities = (payload: unknown) => ({
  type: 'activities/upsertActivities',
  payload,
});
/**
 * The set-up transaction record, emitted per account. The mocked destination
 * wallet has no account matching the id, so no index is stated — the real run
 * carries one, which is what the report prints.
 */
const delegationSubmitted = (txId = 'delegation-tx') =>
  migrateWalletActions.migrateWallet.delegationSubmitted({ txId });
const actions = {
  migrateWallet: migrateWalletActions.migrateWallet,
  activities: { upsertActivities },
} as never;
const dependencies = () =>
  ({
    actions,
    logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  } as never);

/** Records what the builder was asked to build, so the certificate choice is visible. */
const builder = (
  result: unknown = { success: true, serializedTx: 'built-cbor' },
) => {
  const calls: { poolId?: unknown; accountId?: unknown }[] = [];
  return {
    calls,
    makeBuildEarnRewardsTx: (() =>
      (params: { poolId?: unknown; accountId?: unknown }) => {
        calls.push(params);
        return of(result);
      }) as never,
  };
};

/**
 * The executor's confirm and submit phases, stubbed at the entry-point factory:
 * the real one correlates its result by a generated id a test cannot know.
 */
const pendingActivity = { activityId: 'delegation-tx', type: 'Pending' };
/** Stands in for reading a real signed body, which a marble test has none of. */
const derives = (activity: unknown = pendingActivity) =>
  (() => activity) as never;
const capturingDerives = (activity: unknown = pendingActivity) => {
  const calls: { accountUtxos?: unknown[] }[] = [];
  return {
    calls,
    derivePendingActivity: ((args: { accountUtxos?: unknown[] }) => {
      calls.push(args);
      return activity;
    }) as never,
  };
};

const confirmPhaseAction = {
  type: 'txExecutor/tx-phase-requested',
  payload: { executionId: 'x1', config: { type: 'confirmTx' } },
};

// The waiting screen's status line: emitted when the funded gate opens (the
// prompt is next) and again once signing succeeded (the prompt is gone).
const phaseConfirming =
  migrateWalletActions.migrateWallet.delegationPhaseChanged({
    phase: 'confirming',
  });
const phaseFinishing =
  migrateWalletActions.migrateWallet.delegationPhaseChanged({
    phase: 'finishing',
  });

const executor = ({
  confirmed = { success: true, serializedTx: 'signed-cbor' } as unknown,
  submitted = { success: true, txId: 'delegation-tx' } as unknown,
  withPhaseAction = false,
}: {
  confirmed?: unknown;
  submitted?: unknown;
  withPhaseAction?: boolean;
} = {}) => ({
  makeConfirm: (() =>
    (_params: unknown, mapResult: (result: unknown) => unknown) =>
      withPhaseAction
        ? of(confirmPhaseAction, mapResult(confirmed))
        : of(mapResult(confirmed))) as never,
  makeSubmit: (() =>
    (_params: unknown, mapResult: (result: unknown) => unknown) =>
      of(mapResult(submitted))) as never,
});

const stateFor = (
  { hot, cold }: { hot: RunHelpers['hot']; cold: RunHelpers['cold'] },
  {
    rewardAccountInfo = {} as Record<string, unknown>,
    rewardInfoMarble = 'a',
    flags = featureFlags,
    utxos = [utxo],
    utxosMarble = 'a',
    unspendable = [] as never[],
    // One object, so a test can pass `{}` to model a resume where neither the
    // tx id nor the chunk ledger survived (a field-level default would resolve
    // an explicit `undefined` back to 'sweep1').
    sweep = { txId: 'sweep1' } as {
      txId?: string;
      progress?: { submittedChunks: { index: number; txId: string }[] };
    },
    preparedDestinationAccounts = undefined as
      | { destinationAccountIndex: number; accountId: string }[]
      | undefined,
    discovery = undefined as
      | { preserveUnfundedSetupAccounts?: number[] }
      | undefined,
    accountMapping = undefined as
      | {
          sourceAccountIndex: number;
          destinationAccountIndex: number;
          sourcePoolId?: string;
        }[]
      | undefined,
    // Preserve by default: the disclosed-shortfall skip is a preserve rule, and
    // most cases here exercise it.
    migrationMode = 'preserve' as 'consolidate' | 'preserve' | undefined,
    chosenPool = undefined as
      | { poolId: string; ticker: string | null; ros?: number }
      | undefined,
    needsPoolChoice = undefined as boolean | undefined,
    delegationSubmissions = undefined as { txId: string }[] | undefined,
  } = {},
) => {
  // Every account the run will delegate must be servable: preserve mode
  // walks them all, so keying the fixtures to the primary alone would stall
  // the loop rather than assert anything.
  const accountIds = (preparedDestinationAccounts ?? []).length
    ? preparedDestinationAccounts!.map(entry => entry.accountId)
    : [destinationAccountId];
  const byAccount = <T>(value: T) =>
    Object.fromEntries(accountIds.map(id => [id, value]));
  return {
    migrateWallet: {
      selectDestinationAccountId$: hot('a', { a: destinationAccountId }),
      selectSweepTxId$: hot('a', { a: sweep.txId }),
      selectSweepProgress$: hot('a', { a: sweep.progress }),
      // Consolidate by default: one landing account, so the loop runs once
      // and the emissions match the pre-preservation behaviour exactly.
      selectPreparedDestinationAccounts$: hot('a', {
        a: preparedDestinationAccounts,
      }),
      // No disclosed set-up shortfalls by default, so every landing account is
      // delegated (the review would have said otherwise).
      selectDiscovery$: hot('a', { a: discovery }),
      selectAccountMapping$: hot('a', { a: accountMapping }),
      selectMigrationMode$: hot('a', { a: migrationMode }),
      selectChosenPool$: hot('a', { a: chosenPool }),
      selectNeedsPoolChoice$: hot('a', { a: needsPoolChoice }),
      selectDelegationSubmissions$: hot('a', { a: delegationSubmissions }),
    },
    cardanoContext: {
      selectChainId$: hot('a', { a: chainId }),
      // Read inside the per-run pipeline, so subscribed after the trigger.
      selectRewardAccountDetails$: cold(rewardInfoMarble, {
        a: byAccount({ rewardAccountInfo }),
      }),
      // Raw on-chain UTxOs: the settlement gate reads these, never the
      // in-flight-adjusted "available" view. `e` = sync has seen nothing yet.
      selectAccountUtxos$: cold(utxosMarble, {
        e: {},
        a: byAccount(utxos),
      }),
      selectAccountUnspendableUtxos$: cold('a', {
        a: byAccount(unspendable),
      }),
    },
    features: {
      selectLoadedFeatures$: hot('a', { a: { featureFlags: flags } }),
    },
    wallets: {
      selectAll$: cold('a', {
        a: [{ accounts: accountIds.map(accountId => ({ accountId })) }],
      }),
    },
    addresses: {
      selectByAccountId$: cold('a', {
        a: () => [{ blockchainName: 'Cardano', address: 'addr_test1dest' }],
      }),
    },
  } as never;
};

const sweepSucceeded = (hot: RunHelpers['hot']) => ({
  migrateWallet: {
    sweepSucceeded$: hot('-a', {
      a: migrateWalletActions.migrateWallet.sweepSucceeded({ txId: 'sweep1' }),
    }),
    delegationRetryRequested$: hot('-'),
  },
});

describe('delegationPlan', () => {
  it('delegates stake and vote for a destination that is not staking', () => {
    expect(delegationPlan(target, {})).toEqual({ poolId: POOL });
  });

  // The destination's own pool is the user's choice; moving it is exactly what
  // this flow must never do.
  it('delegates the vote alone for a destination that already stakes', () => {
    expect(delegationPlan(target, { poolId: 'pool1theirs' })).toEqual({
      poolId: undefined,
    });
  });

  /**
   * A migration moves the user's holdings; it should not also move their
   * delegation. Where the source account staked wins over the promoted or
   * chosen pool, so an account arrives staking where it already was.
   */
  it("keeps the source account's pool over the target", () => {
    expect(delegationPlan(target, {}, PRESERVED)).toEqual({
      poolId: PRESERVED,
    });
  });

  // The destination's own pool still wins over both: it is a delegation the
  // user made on the wallet they are migrating INTO.
  it('leaves a destination that already stakes alone, preserved pool or not', () => {
    expect(
      delegationPlan(target, { poolId: 'pool1theirs' }, PRESERVED),
    ).toEqual({ poolId: undefined });
  });

  it('falls back to the target when the source staked nowhere', () => {
    expect(delegationPlan(target, {}, undefined)).toEqual({ poolId: POOL });
  });

  /**
   * The empty transaction. With no promoted DRep the vote leg has nothing to
   * carry, and an already-staking destination gives the stake leg nothing
   * either — so the builder was asked for a transaction with no certificate in
   * it, and in the migration that lands after the sweep has moved the funds.
   *
   * Only reachable since the two legs became independent.
   */
  it('carries nothing when the account stakes and no DRep is promoted', () => {
    expect(delegationPlan({ poolId: POOL }, { poolId: 'pool1theirs' })).toBe(
      'nothing',
    );
  });

  // The same outcome for the older reason: a vote certificate cannot reference
  // an unregistered credential, so a fresh key with no pool has nothing to send.
  it('carries nothing for a fresh key with no pool to delegate to', () => {
    expect(delegationPlan({ dRep: target.dRep }, {})).toBe('nothing');
  });

  // Still a real plan: the account stakes, so its credential is registered and
  // the vote leg can travel alone.
  it('still delegates the vote alone for a staked account with a DRep', () => {
    expect(delegationPlan(target, { poolId: 'pool1theirs' })).toEqual({
      poolId: undefined,
    });
  });

  it('skips only a destination already delegated to the promoted DRep', () => {
    expect(
      delegationPlan(target, { drepId: DREP, poolId: 'pool1theirs' }),
    ).toBe('skip');
  });

  // The condition of use is the PROMOTED DRep: a third-party DRep or an
  // abstain / no-confidence sentinel is re-pointed, never respected as done.
  it('re-points a third-party DRep to the promoted one, pool untouched', () => {
    expect(
      delegationPlan(target, {
        drepId: 'drep1yfhhtwy2h9t6d9yw5rerve4mgt5f45vze9nqewx0qhqkxjcmk99hj7',
        poolId: 'pool1theirs',
      }),
    ).toEqual({ poolId: undefined });
  });

  it('re-points an abstain sentinel delegation', () => {
    expect(
      delegationPlan(target, {
        drepId: 'drep_always_abstain',
        poolId: 'pool1theirs',
      }),
    ).toEqual({ poolId: undefined });
  });

  it('re-points when the stored id cannot be parsed, the safe direction', () => {
    expect(
      delegationPlan(target, { drepId: 'not-a-drep', poolId: 'pool1theirs' }),
    ).toEqual({ poolId: undefined });
  });
});

describe('completeTargetWithChosenPool', () => {
  const chosen = { poolId: `${POOL}`, ticker: 'PICK' as string | null };

  it('completes a target the configuration left without a pool', () => {
    expect(completeTargetWithChosenPool({ dRep: target.dRep }, chosen)).toEqual(
      { dRep: target.dRep, poolId: POOL },
    );
  });

  it('never overrides a promoted pool', () => {
    expect(completeTargetWithChosenPool(target, chosen)).toBe(target);
  });

  it('passes an absent target and an absent choice through', () => {
    expect(completeTargetWithChosenPool(undefined, chosen)).toBeUndefined();
    const dRepOnly = { dRep: target.dRep };
    expect(completeTargetWithChosenPool(dRepOnly, undefined)).toBe(dRepOnly);
  });

  // Degrades, never throws: this runs inside the post-sweep delegation stream,
  // where an uncaught throw would kill the run after funds moved.
  it('degrades a malformed stored pool id to the configured target', () => {
    expect(
      completeTargetWithChosenPool(
        { dRep: target.dRep },
        { poolId: 'not-a-pool-id', ticker: null },
      ),
    ).toEqual({ dRep: target.dRep });
  });
});

describe('makeRunDelegation', () => {
  it('settles as unavailable when no promoted target exists for the network', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor({ hot, cold }, { flags: [] }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: { status: 'unavailable' },
            }),
          });
        },
      }),
    );
    // Nothing is built when there is nothing to delegate to.
    expect(calls).toHaveLength(0);
  });

  // Also the idempotent-retry path: a retry after a submission that landed
  // re-reads the destination, finds the PROMOTED DRep set, and settles instead
  // of submitting a second time.
  it('settles without a transaction when the destination already has the promoted DRep', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          {
            rewardAccountInfo: { drepId: DREP, poolId: 'pool1theirs' },
          },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: { status: 'already-delegated' },
            }),
          });
        },
      }),
    );
    expect(calls).toHaveLength(0);
  });

  it('builds with the promoted pool and reports both delegations', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor({ hot, cold }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-(cfsab)', {
            c: phaseConfirming,
            f: phaseFinishing,
            s: delegationSubmitted(),
            a: upsertActivities({
              accountId: destinationAccountId,
              activities: [pendingActivity],
            }),
            b: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
                poolId: `${POOL}`,
              },
            }),
          });
        },
      }),
    );
    expect(calls).toEqual([
      { accountId: destinationAccountId, poolId: POOL, dRep: target.dRep },
    ]);
  });

  it('builds vote-only for a destination that already stakes, and claims no pool moved', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          { rewardAccountInfo: { poolId: 'pool1theirs' } },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-(cfsab)', {
            c: phaseConfirming,
            f: phaseFinishing,
            s: delegationSubmitted(),
            a: upsertActivities({
              accountId: destinationAccountId,
              activities: [pendingActivity],
            }),
            b: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
              },
            }),
          });
        },
      }),
    );
    expect(calls).toEqual([
      { accountId: destinationAccountId, poolId: undefined, dRep: target.dRep },
    ]);
  });

  // ── The wizard's pool choice (LW-15293) ──
  // With no promoted pool configured, the pool the user chose completes the
  // dRep-only target and the set-up runs exactly as if it had been promoted.
  const dRepOnlyFlags = featureFlags.filter(
    flag => flag.key !== FEATURE_FLAG_STAKING_CENTER,
  );
  const CHOSEN_POOL = Cardano.PoolId(
    'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
  );

  it('builds with the pool the wizard collected when the target names none', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          {
            flags: dRepOnlyFlags,
            needsPoolChoice: true,
            chosenPool: { poolId: `${CHOSEN_POOL}`, ticker: 'PICK', ros: 0.03 },
          },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-(cfsab)', {
            c: phaseConfirming,
            f: phaseFinishing,
            s: delegationSubmitted(),
            a: upsertActivities({
              accountId: destinationAccountId,
              activities: [pendingActivity],
            }),
            b: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
                poolId: `${CHOSEN_POOL}`,
              },
            }),
          });
        },
      }),
    );
    expect(calls).toEqual([
      {
        accountId: destinationAccountId,
        poolId: CHOSEN_POOL,
        dRep: target.dRep,
      },
    ]);
  });

  /**
   * The receipt is settled by the LAST account, which here delegates nothing —
   * so without deferring to an earlier success the done screen tells a user
   * their rewards are not set up and offers a recovery action, after account 0
   * was registered and charged its deposit.
   *
   * Exactly the run the pool screen exists for: preserve mode where some
   * accounts carry a pool over and some have none (`hasPoolLeftToChoose`), and
   * the user declined to pick one for the rest.
   */
  it('reports the delegation an earlier account made when the last one makes none', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    const secondAccountId = AccountId('destination-account-2');
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, flush }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          {
            flags: dRepOnlyFlags,
            needsPoolChoice: true,
            preparedDestinationAccounts: [
              { destinationAccountIndex: 0, accountId: destinationAccountId },
              { destinationAccountIndex: 1, accountId: secondAccountId },
            ],
            accountMapping: [
              {
                sourceAccountIndex: 0,
                destinationAccountIndex: 0,
                sourcePoolId: `${CHOSEN_POOL}`,
              },
              { sourceAccountIndex: 1, destinationAccountIndex: 1 },
            ],
          },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          const emissions: { type: string; payload?: unknown }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const settles = emissions.filter(
            ({ type }) => type === 'migrateWallet/delegationSettled',
          );
          expect(settles).toHaveLength(1);
          expect(
            (settles[0].payload as { outcome: { status: string } }).outcome
              .status,
          ).toBe('delegated');
        },
      }),
    );
    // Only the account that had a pool to keep is built for.
    expect(calls).toHaveLength(1);
    expect(calls[0].poolId).toBe(CHOSEN_POOL);
  });

  /**
   * The deferral above lives in ONE projection, and a retry is a new one: an
   * account whose first-attempt transaction landed re-reads as delegated →
   * `skip` → records nothing in the fresh closure. The persisted submissions
   * are what survive the boundary, so the receipt seeds from them — without
   * that, this run settled `undelegated` after charging a deposit and
   * delegating on attempt one.
   */
  it('reports a delegation persisted by the first attempt when the retry itself makes none', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    const secondAccountId = AccountId('destination-account-2');
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, flush }) => ({
        actionObservables: {
          migrateWallet: {
            sweepSucceeded$: hot('-'),
            delegationRetryRequested$: hot('-a', {
              a: migrateWalletActions.migrateWallet.delegationRetryRequested(),
            }),
          },
        } as never,
        stateObservables: stateFor(
          { hot, cold },
          {
            flags: dRepOnlyFlags,
            needsPoolChoice: true,
            // Attempt one delegated account 0 (its tx landed and is persisted);
            // this retry finds it already delegated to the target's DRep.
            delegationSubmissions: [{ txId: 'delegation-tx-1' }],
            rewardAccountInfo: { drepId: DREP },
            preparedDestinationAccounts: [
              { destinationAccountIndex: 0, accountId: destinationAccountId },
              { destinationAccountIndex: 1, accountId: secondAccountId },
            ],
            accountMapping: [
              {
                sourceAccountIndex: 0,
                destinationAccountIndex: 0,
                sourcePoolId: `${CHOSEN_POOL}`,
              },
              { sourceAccountIndex: 1, destinationAccountIndex: 1 },
            ],
          },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          const emissions: { type: string; payload?: unknown }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const settles = emissions.filter(
            ({ type }) => type === 'migrateWallet/delegationSettled',
          );
          expect(settles).toHaveLength(1);
          expect(
            (
              settles[0].payload as {
                outcome: { status: string; txId?: string };
              }
            ).outcome,
          ).toMatchObject({ status: 'delegated', txId: 'delegation-tx-1' });
        },
      }),
    );
    // Nothing was rebuilt: account 0 skips, account 1 was declined.
    expect(calls).toHaveLength(0);
  });

  // `undelegated`, not `unavailable`: the choice was offered and declined, so
  // the done screen reports rewards not set up and offers the recovery action.
  it('settles as undelegated when the offered pool choice was declined', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          { flags: dRepOnlyFlags, needsPoolChoice: true },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: { status: 'undelegated' },
            }),
          });
        },
      }),
    );
    expect(calls).toHaveLength(0);
  });

  // Declining skips the stake leg only. The vote delegation is the condition
  // of use, and a destination whose credential is already registered can still
  // meet it — the declined pool never blocks that.
  it('still delegates the vote after a declined choice when the destination already stakes', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          {
            flags: dRepOnlyFlags,
            needsPoolChoice: true,
            rewardAccountInfo: { poolId: 'pool1theirs' },
          },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-(cfsab)', {
            c: phaseConfirming,
            f: phaseFinishing,
            s: delegationSubmitted(),
            a: upsertActivities({
              accountId: destinationAccountId,
              activities: [pendingActivity],
            }),
            b: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
              },
            }),
          });
        },
      }),
    );
    expect(calls).toEqual([
      { accountId: destinationAccountId, poolId: undefined, dRep: target.dRep },
    ]);
  });

  // `unavailable`, not `undelegated`: nothing was ever configured or offered
  // for this destination, so there is nothing for the done screen to finish.
  it('settles as unavailable when a dRep-only target reaches a fresh key with no choice offered', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor({ hot, cold }, { flags: dRepOnlyFlags }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: { status: 'unavailable' },
            }),
          });
        },
      }),
    );
    expect(calls).toHaveLength(0);
  });

  /**
   * The suppressed choice's premise can collapse: discovery saw the fixed
   * landing account staking and asked nothing, then the account was
   * undelegated on-chain (a Keystone key is co-owned by an external signer)
   * before the delegation leg ran. `unavailable` here rendered NOTHING on the
   * done screen — no sentence, no recovery — for a wallet whose set-up a
   * configured target still owes. Only a choice that was never in play
   * (undefined, discovery predating it) reports unavailable.
   */
  it('settles as undelegated when a suppressed choice reaches a key that no longer stakes', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          { flags: dRepOnlyFlags, needsPoolChoice: false },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: { status: 'undelegated' },
            }),
          });
        },
      }),
    );
    expect(calls).toHaveLength(0);
  });

  // Preserve mode: only the FINAL account settles the run. A non-final fresh
  // account with no pool must be skipped silently, and the run must still
  // process the accounts after it — an intermediate settle would send the
  // wizard to done with later accounts untouched.
  it('skips a non-final account that cannot be set up, settling on the last', () => {
    const { makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          {
            flags: dRepOnlyFlags,
            needsPoolChoice: true,
            preparedDestinationAccounts: [
              { destinationAccountIndex: 0, accountId: 'dest-a' },
              { destinationAccountIndex: 1, accountId: 'dest-b' },
            ],
          },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: { status: 'undelegated' },
            }),
          });
        },
      }),
    );
  });

  // With a promoted pool configured no choice was ever offered, so a lingering
  // chosenPool is stale state from an older run — never an override.
  it('ignores a stale chosen pool when the target has a promoted pool', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          {
            chosenPool: { poolId: `${CHOSEN_POOL}`, ticker: 'PICK' },
          },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-(cfsab)', {
            c: phaseConfirming,
            f: phaseFinishing,
            s: delegationSubmitted(),
            a: upsertActivities({
              accountId: destinationAccountId,
              activities: [pendingActivity],
            }),
            b: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
                poolId: `${POOL}`,
              },
            }),
          });
        },
      }),
    );
    expect(calls).toEqual([
      { accountId: destinationAccountId, poolId: POOL, dRep: target.dRep },
    ]);
  });

  // Each stage pauses under its own phase: an undelegated finish is otherwise
  // one undiagnosable number.
  // `reason: 'BAD_REQUEST'` classifies non-retriable, so these assert the
  // immediate-pause path; the transparent-retry tier has its own test below.
  it.each([
    [
      'fee-calculation',
      {
        build: {
          success: false,
          error: Object.assign(new Error('x'), { reason: 'BAD_REQUEST' }),
        },
      },
    ],
    [
      'signing',
      { confirmed: { success: false, error: { message: 'dismissed' } } },
    ],
    [
      'submission',
      {
        submitted: {
          success: false,
          error: { message: 'rejected', reason: 'BAD_REQUEST' },
        },
      },
    ],
  ] as const)(
    'pauses under the %s phase rather than discarding the migration',
    (phase, stubs) => {
      const { makeBuildEarnRewardsTx } = builder(
        'build' in stubs ? stubs.build : undefined,
      );
      testSideEffect(
        makeRunDelegation({
          makeBuildEarnRewardsTx,
          ...executor('build' in stubs ? {} : stubs),
          derivePendingActivity: derives(),
        }),
        ({ hot, cold, expectObservable }) => ({
          actionObservables: sweepSucceeded(hot) as never,
          stateObservables: stateFor({ hot, cold }),
          dependencies: dependencies(),
          assertion: sideEffect$ => {
            // The gate opened in every case, so `confirming` precedes the
            // pause; only a signed transaction also reports `finishing`.
            expectObservable(sideEffect$).toBe(
              phase === 'submission' ? '-(cfa)' : '-(ca)',
              {
                c: phaseConfirming,
                f: phaseFinishing,
                a: migrateWalletActions.migrateWallet.delegationPaused({
                  errorKey: 'migrate-wallet.error.delegation-failed',
                  phase,
                }),
              },
            );
          },
        }),
      );
    },
  );

  // Building against an unfunded destination fails for want of an input, so
  // the step waits for the swept funds instead of starting on empty.
  it('waits for the swept funds to land before building', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor({ hot, cold }, { utxos: [] }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          // The discovery timeout bounds the wait, then the user can retry.
          expectObservable(sideEffect$).toBe('- 180000ms a', {
            a: migrateWalletActions.migrateWallet.delegationPaused({
              errorKey: 'migrate-wallet.error.delegation-failed',
              phase: 'fee-calculation',
            }),
          });
        },
      }),
    );
    expect(calls).toHaveLength(0);
  });

  // The regression this pins: the sweep records its pending activity at
  // submit, which the "available" UTxO view credits to the destination
  // immediately — a gate reading that view opens before anything settles and
  // the build fails for want of an input. The gate must hold until the raw
  // on-chain set has the funds.
  it('holds the build until the swept UTxOs settle on-chain', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor({ hot, cold }, { utxosMarble: 'e 9ms a' }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('- 10ms (cfsab)', {
            c: phaseConfirming,
            f: phaseFinishing,
            s: delegationSubmitted(),
            a: upsertActivities({
              accountId: destinationAccountId,
              activities: [pendingActivity],
            }),
            b: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
                poolId: `${POOL}`,
              },
            }),
          });
        },
      }),
    );
    expect(calls).toHaveLength(1);
  });

  // Mirrors the builder's own subtraction: a UTxO the executor marks
  // unspendable cannot fund the delegation, so it must not open the gate.
  it('does not count unspendable UTxOs as settled funding', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor({ hot, cold }, { unspendable: [utxo] }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('- 180000ms a', {
            a: migrateWalletActions.migrateWallet.delegationPaused({
              errorKey: 'migrate-wallet.error.delegation-failed',
              phase: 'fee-calculation',
            }),
          });
        },
      }),
    );
    expect(calls).toHaveLength(0);
  });

  // An existing destination may already hold UTxOs (the picker does not filter
  // by balance). Those must not open the gate: if they are dust, the build
  // cannot cover deposit + fee and the user lands on a manual retry that the
  // settled sweep would have made unnecessary.
  it('does not open the gate on pre-existing UTxOs that are not swept outputs', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor({ hot, cold }, { utxos: [preexistingUtxo] }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('- 180000ms a', {
            a: migrateWalletActions.migrateWallet.delegationPaused({
              errorKey: 'migrate-wallet.error.delegation-failed',
              phase: 'fee-calculation',
            }),
          });
        },
      }),
    );
    expect(calls).toHaveLength(0);
  });

  // A chunked sweep funds the destination across several transactions; any
  // one of their outputs settling is enough to cover deposit + fee.
  it('opens the gate on any chunk of a chunked sweep landing', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          {
            utxos: [
              preexistingUtxo,
              [{ txId: 'chunk2' }, { value: { coins: 5_000_000n } }] as never,
            ],
            sweep: {
              txId: 'chunk2',
              progress: {
                submittedChunks: [
                  { index: 0, txId: 'chunk1' },
                  { index: 1, txId: 'chunk2' },
                ],
              },
            },
          },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-(cfsab)', {
            c: phaseConfirming,
            f: phaseFinishing,
            s: delegationSubmitted(),
            a: upsertActivities({
              accountId: destinationAccountId,
              activities: [pendingActivity],
            }),
            b: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
                poolId: `${POOL}`,
              },
            }),
          });
        },
      }),
    );
    expect(calls).toHaveLength(1);
  });

  // A resumed migration can reach delegation without the sweep tx ids in
  // state; with nothing to anchor on, any spendable UTxO stands in — worse
  // than the anchored gate, better than never delegating.
  it('falls back to any spendable UTxO when no sweep tx ids are known', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          { utxos: [preexistingUtxo], sweep: {} },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-(cfsab)', {
            c: phaseConfirming,
            f: phaseFinishing,
            s: delegationSubmitted(),
            a: upsertActivities({
              accountId: destinationAccountId,
              activities: [pendingActivity],
            }),
            b: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
                poolId: `${POOL}`,
              },
            }),
          });
        },
      }),
    );
    expect(calls).toHaveLength(1);
  });

  // The transaction is on-chain by the time the activity is derived, so a body
  // that cannot be read is a missing row — never a delegation reported failed.
  it('still settles when the pending activity cannot be derived', () => {
    const { makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: (() => {
          throw new Error('unreadable body');
        }) as never,
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor({ hot, cold }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-(cfsa)', {
            c: phaseConfirming,
            f: phaseFinishing,
            s: delegationSubmitted(),
            a: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
                poolId: `${POOL}`,
              },
            }),
          });
        },
      }),
    );
  });

  // The forwarded non-result emissions are what drive the signing prompt; a
  // refactor that keeps only success-carrying values kills the prompt silently.
  it('forwards the executor phase action that raises the signing prompt', () => {
    const { makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor({ withPhaseAction: true }),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor({ hot, cold }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-(xafsbc)', {
            x: phaseConfirming,
            a: confirmPhaseAction,
            f: phaseFinishing,
            s: delegationSubmitted(),
            b: upsertActivities({
              accountId: destinationAccountId,
              activities: [pendingActivity],
            }),
            c: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
                poolId: `${POOL}`,
              },
            }),
          });
        },
      }),
    );
  });

  // exhaustMap, not merge/switch: a second trigger while a run is in flight
  // must be dropped, or two delegation transactions get built and signed.
  it('ignores a second trigger while a run is in flight', () => {
    const calls: unknown[] = [];
    testSideEffect(
      {
        build: ({ cold }) =>
          makeRunDelegation({
            makeBuildEarnRewardsTx: (() => (params: unknown) => {
              calls.push(params);
              return cold('10ms (r|)', {
                r: { success: true, serializedTx: 'built-cbor' },
              });
            }) as never,
            ...executor(),
            derivePendingActivity: derives(),
          }),
      },
      ({ hot, cold, expectObservable }) => ({
        actionObservables: {
          migrateWallet: {
            sweepSucceeded$: hot('-a-a', {
              a: migrateWalletActions.migrateWallet.sweepSucceeded({
                txId: 'sweep1',
              }),
            }),
            delegationRetryRequested$: hot('-'),
          },
        } as never,
        stateObservables: stateFor({ hot, cold }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          // `confirming` fires at the trigger (the gate is already open); the
          // 10ms cold build then holds the rest.
          expectObservable(sideEffect$).toBe('-c 9ms (fsab)', {
            c: phaseConfirming,
            f: phaseFinishing,
            s: delegationSubmitted(),
            a: upsertActivities({
              accountId: destinationAccountId,
              activities: [pendingActivity],
            }),
            b: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
                poolId: `${POOL}`,
              },
            }),
          });
        },
      }),
    );
    expect(calls).toHaveLength(1);
  });

  // An absent reward-account entry means "not yet fetched", never "not
  // staking" — reading it as the latter sends a stake certificate that moves a
  // pool the user chose.
  it('waits for the reward info to arrive before deciding the certificates', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          {
            rewardInfoMarble: '3ms a',
            rewardAccountInfo: { poolId: 'pool1theirs' },
          },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('- 3ms (cfsab)', {
            c: phaseConfirming,
            f: phaseFinishing,
            s: delegationSubmitted(),
            a: upsertActivities({
              accountId: destinationAccountId,
              activities: [pendingActivity],
            }),
            b: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
              },
            }),
          });
        },
      }),
    );
    // Decided from the ARRIVED info: vote-only, because the account stakes.
    expect(calls).toEqual([
      { accountId: destinationAccountId, poolId: undefined, dRep: target.dRep },
    ]);
  });

  // ADR-15 tier 1: a transient provider blip during the build recovers
  // invisibly instead of landing the user on the paused screen.
  it('transparently retries a retriable build failure (ADR 15)', () => {
    let attempts = 0;
    testSideEffect(
      {
        build: () =>
          makeRunDelegation({
            makeBuildEarnRewardsTx: (() => () =>
              defer(() =>
                of(
                  ++attempts === 1
                    ? { success: false, error: new Error('socket hang up') }
                    : { success: true, serializedTx: 'built-cbor' },
                ),
              )) as never,
            ...executor(),
            derivePendingActivity: derives(),
          }),
      },
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor({ hot, cold }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          // First backoff interval is 300ms; the user never sees the blip —
          // `confirming` shows from the first attempt, the retry is invisible.
          expectObservable(sideEffect$).toBe('-c 299ms (fsab)', {
            c: phaseConfirming,
            f: phaseFinishing,
            s: delegationSubmitted(),
            a: upsertActivities({
              accountId: destinationAccountId,
              activities: [pendingActivity],
            }),
            b: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
                poolId: `${POOL}`,
              },
            }),
          });
        },
      }),
    );
    expect(attempts).toBe(2);
  });

  // The derivation must see the destination's own UTxOs: with [] it cannot
  // recognise the tx's inputs as its own and records +change — nearly the
  // whole migrated balance — as an incoming transfer.
  it('derives the pending activity against the destination UTxOs, not an empty set', () => {
    const { makeBuildEarnRewardsTx } = builder();
    const capture = capturingDerives();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: capture.derivePendingActivity,
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor({ hot, cold }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-(cfsab)', {
            c: phaseConfirming,
            f: phaseFinishing,
            s: delegationSubmitted(),
            a: upsertActivities({
              accountId: destinationAccountId,
              activities: [pendingActivity],
            }),
            b: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
                poolId: `${POOL}`,
              },
            }),
          });
        },
      }),
    );
    expect(capture.calls).toHaveLength(1);
    expect(capture.calls[0].accountUtxos).toEqual([utxo]);
  });

  // Preserve mode lands funds in one account per source account, and each is
  // a wallet the user stakes from — so each registers its own stake key. The
  // step settles ONCE, after the last: an intermediate settle would send the
  // wizard to `done` with later accounts still undelegated.
  it('delegates every prepared destination account, settling only after the last', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    const secondAccountId = AccountId('destination-account-2');
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, flush }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          {
            preparedDestinationAccounts: [
              { destinationAccountIndex: 0, accountId: destinationAccountId },
              { destinationAccountIndex: 1, accountId: secondAccountId },
            ],
          },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const settles = emissions.filter(
            ({ type }) => type === 'migrateWallet/delegationSettled',
          );
          expect(settles).toHaveLength(1);
          // Progress is reported per account, so the waiting screen does not
          // look like it rewound when the second prompt appears.
          expect(
            emissions
              .filter(
                (action): action is { type: string; payload: unknown } =>
                  action.type === 'migrateWallet/delegationPhaseChanged',
              )
              .map(
                action =>
                  (action.payload as { accountNumber?: number }).accountNumber,
              )
              .filter(number => number !== undefined),
          ).toEqual([1, 2]);

          // One record per account, unlike the settle: the outcome names only
          // the last transaction, so without these the report claims the whole
          // wallet was set up by one transaction that set up one account.
          expect(
            emissions.filter(
              ({ type }) => type === 'migrateWallet/delegationSubmitted',
            ),
          ).toHaveLength(2);
        },
      }),
    );
    // One build per account: two stake keys registered for two accounts.
    expect(calls).toHaveLength(2);
    expect(calls.map(call => call.accountId)).toEqual([
      destinationAccountId,
      secondAccountId,
    ]);
  });

  // The review discloses an account that arrives with too little ADA to cover
  // its own deposit; the delegation must skip it rather than pause the wizard
  // on a shortfall the user already accepted.
  it('skips a landing account the review disclosed as unable to cover its set-up', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    const poorAccountId = AccountId('destination-account-2');
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, flush }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          {
            preparedDestinationAccounts: [
              { destinationAccountIndex: 0, accountId: destinationAccountId },
              { destinationAccountIndex: 1, accountId: poorAccountId },
            ],
            // Source account 1 landed in destination index 1 and cannot cover
            // the deposit.
            discovery: { preserveUnfundedSetupAccounts: [1] },
            accountMapping: [
              { sourceAccountIndex: 0, destinationAccountIndex: 0 },
              { sourceAccountIndex: 1, destinationAccountIndex: 1 },
            ],
          },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
        },
      }),
    );
    expect(calls.map(call => call.accountId)).toEqual([destinationAccountId]);
  });

  // The mode gate this pins. Consolidation repoints every mapping row at the
  // single landing account, so mapping ONE flagged source account through it
  // named that account — and skipping it left the entire consolidated balance
  // undelegated, with nothing on screen saying so: the no-set-up row only
  // renders in preserve. The shortfall disclosure is a preserve figure and must
  // not be read in consolidate.
  it('ignores the preserve shortfall disclosure when consolidating', () => {
    const { calls, makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, flush }) => ({
        actionObservables: sweepSucceeded(hot) as never,
        stateObservables: stateFor(
          { hot, cold },
          {
            migrationMode: 'consolidate',
            // The single landing account consolidation prepared.
            preparedDestinationAccounts: [
              { destinationAccountIndex: 0, accountId: destinationAccountId },
            ],
            // Both rows land in the one account consolidation uses.
            accountMapping: [
              { sourceAccountIndex: 0, destinationAccountIndex: 0 },
              { sourceAccountIndex: 1, destinationAccountIndex: 0 },
            ],
            discovery: { preserveUnfundedSetupAccounts: [1] },
          },
        ),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
        },
      }),
    );
    // The consolidated balance is still delegated.
    expect(calls.map(call => call.accountId)).toEqual([destinationAccountId]);
  });

  it('runs again on a retry, not only after the sweep', () => {
    const { makeBuildEarnRewardsTx } = builder();
    testSideEffect(
      makeRunDelegation({
        makeBuildEarnRewardsTx,
        ...executor(),
        derivePendingActivity: derives(),
      }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: {
          migrateWallet: {
            sweepSucceeded$: hot('-'),
            delegationRetryRequested$: hot('-a', {
              a: migrateWalletActions.migrateWallet.delegationRetryRequested(),
            }),
          },
        } as never,
        stateObservables: stateFor({ hot, cold }),
        dependencies: dependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-(cfsab)', {
            c: phaseConfirming,
            f: phaseFinishing,
            s: delegationSubmitted(),
            a: upsertActivities({
              accountId: destinationAccountId,
              activities: [pendingActivity],
            }),
            b: migrateWalletActions.migrateWallet.delegationSettled({
              outcome: {
                status: 'delegated',
                txId: 'delegation-tx',
                drepId: DREP,
                poolId: `${POOL}`,
              },
            }),
          });
        },
      }),
    );
  });
});
