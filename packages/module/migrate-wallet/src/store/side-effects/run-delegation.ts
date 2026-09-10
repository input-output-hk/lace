import { Cardano } from '@cardano-sdk/core';
import {
  derivePendingActivityFromCbor,
  filterSpendableUtxos,
  isCardanoAddress,
  isSentinelDrepId,
} from '@lace-contract/cardano-context';
import { resolveEarnRewardsTarget } from '@lace-contract/earn-rewards';
import { makeConfirmTx, makeSubmitTx } from '@lace-contract/tx-executor';
import { isHardwareWallet } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-lib/util';
import {
  PROVIDER_REQUEST_RETRY_CONFIG,
  isRetriableError,
} from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
  combineLatest,
  concat,
  concatMap,
  defer,
  from,
  EMPTY,
  exhaustMap,
  filter,
  map,
  mergeMap,
  merge,
  of,
  switchMap,
  take,
  timeout,
  withLatestFrom,
} from 'rxjs';

import { DISCOVERY_TIMEOUT_MS } from './create-source-context';
import { classifyDeviceHint } from './device-hint';

import type { SideEffect } from '../..';
import type {
  ChosenPool,
  DelegationFailurePhase,
  DelegationOutcome,
  DelegationSubmission,
  DeviceWaitHintKey,
} from '../slice';
import type {
  BuildEarnRewardsTx,
  CardanoPaymentAddress,
  MakeBuildEarnRewardsTx,
} from '@lace-contract/cardano-context';
import type { EarnRewardsTarget } from '@lace-contract/earn-rewards';
import type { ConfirmTx, SubmitTx } from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';

type SideEffectDeps = Parameters<SideEffect>[2];
type StateObservables = Parameters<SideEffect>[1];

/**
 * True when the account's vote delegation already points at the promoted DRep.
 * Compared by credential, not by string: bech32 DRep ids have two encodings
 * (CIP-105 and CIP-129), and Blockfrost's echo of an id need not use the
 * encoding the promoted target was configured with — a string mismatch here
 * would re-submit an identical delegation on every retry. Sentinels (abstain /
 * no-confidence) are never the promoted DRep, and an unparseable id falls
 * through to re-pointing, which is the safe direction.
 */
const isDelegatedToTargetDRep = (
  drepId: unknown,
  target: EarnRewardsTarget,
): boolean => {
  // No promoted DRep configured: there is nothing the delegation could already
  // point AT, so the vote leg can never be the reason to skip.
  if (target.dRep === undefined) return false;
  if (typeof drepId !== 'string' || drepId === '' || isSentinelDrepId(drepId)) {
    return false;
  }
  try {
    const current = Cardano.DRepID.toCredential(Cardano.DRepID(drepId));
    const promoted = Cardano.DRepID.toCredential(target.dRep.drepId);
    return current.hash === promoted.hash && current.type === promoted.type;
  } catch {
    return false;
  }
};

/**
 * The certificates this run will carry, decided from the destination's own
 * delegation state.
 *
 * The condition of use is voting power delegated to the PROMOTED DRep, so
 * `skip` only when it already points there — any other vote delegation
 * (a third-party DRep, an abstain / no-confidence sentinel) is re-pointed.
 * `poolId` absent means vote-only — the destination already stakes somewhere
 * and that pool is left exactly as set; the stake delegation is the user's
 * and never moves.
 *
 * `preservedPoolId` is where the SOURCE account staked, and it wins over the
 * target: a migration moves the user's holdings, so it should not also move
 * their delegation. Only preserve mode supplies one — consolidate merges
 * accounts, and with them any number of different pools, so there is nothing
 * to carry over.
 */
export const delegationPlan = (
  target: EarnRewardsTarget,
  rewardAccountInfo: { poolId?: unknown; drepId?: unknown },
  preservedPoolId?: EarnRewardsTarget['poolId'],
): 'nothing' | 'skip' | { poolId?: EarnRewardsTarget['poolId'] } => {
  if (isDelegatedToTargetDRep(rewardAccountInfo.drepId, target)) return 'skip';

  const poolId = rewardAccountInfo.poolId
    ? undefined
    : preservedPoolId ?? target.poolId;

  // Nothing this account can be sent. With no pool to set — it already stakes,
  // or none is configured, chosen or preserved — the vote leg has to carry the
  // transaction alone, and it cannot when either:
  //
  //   - no DRep is promoted, so there is no vote to delegate. Reachable only
  //     since the two legs became independent; with a DRep always configured
  //     the vote was always something to do.
  //   - the key is unregistered, because a vote certificate cannot reference an
  //     unregistered credential and the builder refuses.
  //
  // Named rather than returned as an empty plan: the builder would be asked for
  // a transaction with no certificate in it, and in the migration that happens
  // AFTER the sweep has moved the funds.
  if (
    poolId === undefined &&
    (target.dRep === undefined || !rewardAccountInfo.poolId)
  )
    return 'nothing';

  return { poolId };
};

/**
 * The pool the wizard's choice step collected completes a target the
 * configuration left without one (LW-15293). It never overrides a promoted
 * pool: with one configured, no choice was offered and a lingering
 * `chosenPool` is stale state. A malformed stored pool id degrades to the
 * configured target — the declined path — rather than throwing: this runs in
 * both the review's disclosure (a render) and the post-sweep delegation
 * stream, where an uncaught throw would kill the run AFTER funds moved, with
 * no retry left alive.
 */
export const completeTargetWithChosenPool = (
  configured: EarnRewardsTarget | undefined,
  chosenPool: ChosenPool | undefined,
): EarnRewardsTarget | undefined => {
  if (!configured || configured.poolId !== undefined || !chosenPool)
    return configured;
  try {
    return { ...configured, poolId: Cardano.PoolId(chosenPool.poolId) };
  } catch {
    return configured;
  }
};

/**
 * The destination's confirmed delegation state, once the provider has reported
 * it. Waiting rather than defaulting: an absent entry means "not yet fetched",
 * and reading it as "not staking" would send a stake-delegation certificate for
 * an account that already stakes, moving a pool the user chose.
 */
const destinationRewardInfo$ = (
  accountId: AccountId,
  { cardanoContext: { selectRewardAccountDetails$ } }: StateObservables,
) =>
  selectRewardAccountDetails$.pipe(
    map(details => details[accountId]?.rewardAccountInfo),
    filter(info => info !== undefined),
    take(1),
  );

/**
 * Waits for the swept funds to become spendable at the destination. The sweep
 * reports success at submit, so at this point the transaction is in flight and
 * the destination's UTxO set is still empty — building against it would fail
 * for want of an input, and read to the user as a delegation that cannot work.
 *
 * Raw UTxOs, NOT selectAvailableAccountUtxos$: "available" applies in-flight
 * adjustments that credit the sweep's outputs the moment it is submitted, so
 * it passes this gate before anything settles — while the builder reads the
 * raw on-chain set and finds nothing. The gate must watch the same ledger the
 * builder consumes, minus the unspendable set the builder also subtracts.
 *
 * Waits for a swept output specifically, not any spendable UTxO: an existing
 * destination may already hold a set (the picker does not filter by balance)
 * that opens a non-empty gate before the sweep settles — and if that set is
 * dust, input selection cannot cover deposit + fee and the user lands on a
 * manual retry. Non-emptiness is the fallback only when no sweep tx ids are
 * known to anchor on.
 */
const destinationFunded$ = (
  accountId: AccountId,
  sweepTxIds: readonly string[],
  {
    cardanoContext: { selectAccountUtxos$, selectAccountUnspendableUtxos$ },
  }: StateObservables,
) =>
  combineLatest([selectAccountUtxos$, selectAccountUnspendableUtxos$]).pipe(
    map(([utxos, unspendable]) =>
      filterSpendableUtxos(
        utxos[accountId] ?? [],
        unspendable[accountId] ?? [],
      ),
    ),
    filter(utxos =>
      sweepTxIds.length > 0
        ? utxos.some(([txIn]) => sweepTxIds.includes(txIn.txId))
        : utxos.length > 0,
    ),
    take(1),
  );

const destinationAddresses$ = (
  accountId: AccountId,
  { addresses: { selectByAccountId$ } }: StateObservables,
) =>
  selectByAccountId$.pipe(
    map(selectByAccountId =>
      selectByAccountId(accountId)
        .filter(isCardanoAddress)
        .map(({ address }) => address as CardanoPaymentAddress),
    ),
    filter(addresses => addresses.length > 0),
    take(1),
  );

const destinationWallet$ = (
  accountId: AccountId,
  { wallets: { selectAll$ } }: StateObservables,
) =>
  selectAll$.pipe(
    map(wallets =>
      wallets.find(wallet =>
        wallet.accounts.some(account => account.accountId === accountId),
      ),
    ),
    filter(wallet => wallet !== undefined),
    take(1),
  );

/**
 * A submitted set-up transaction and which account of the destination wallet it
 * set up. The index is omitted rather than recorded as undefined when the
 * account cannot be found: the report distinguishes "account 0" from "not
 * stated", and an absent key is the honest form of the latter.
 */
const submissionOf = (
  txId: string,
  wallet: AnyWallet,
  accountId: AccountId,
): DelegationSubmission => {
  const destinationAccountIndex = (
    wallet.accounts.find(account => account.accountId === accountId)
      ?.blockchainSpecific as { accountIndex?: number } | undefined
  )?.accountIndex;
  return {
    txId,
    ...(destinationAccountIndex === undefined
      ? {}
      : { destinationAccountIndex }),
  };
};

const pause = (
  { actions }: SideEffectDeps,
  phase: DelegationFailurePhase,
  deviceHintKey?: DeviceWaitHintKey,
) =>
  of(
    actions.migrateWallet.delegationPaused({
      errorKey: 'migrate-wallet.error.delegation-failed',
      phase,
      deviceHintKey,
    }),
  );

/** Executor results pass through untouched; phase actions ride alongside. */
const forwardExecutorResult = <T>(result: T): T => result;

/**
 * Rethrows a retriable failed submission so retryBackoff re-subscribes.
 * Re-wrap: the folded error is a serialized plain object, and copying its
 * fields keeps the retry classification identical for the thrown value.
 */
const rethrowRetriableSubmission = <T>(submitted: T): T => {
  if (
    typeof submitted === 'object' &&
    submitted !== null &&
    'success' in submitted &&
    (submitted as { success: unknown }).success === false
  ) {
    const { error } = submitted as { error?: { message?: string } };
    if (isRetriableError(error)) {
      throw Object.assign(
        new Error(error?.message ?? 'Submission failed'),
        error,
      );
    }
  }
  return submitted;
};

/**
 * Builds, signs and submits the destination's delegation. Deliberately does NOT
 * drive the earn-rewards flow slice: that contract is implemented only when the
 * earn-rewards feature is on, and a migration must still run when it is off
 * (settling as `unavailable` rather than refusing to load at all).
 *
 * The three stages map to the three failure phases, which is what makes an
 * undelegated finish diagnosable: no funds, a dismissed device prompt, and a
 * rejecting node are unrelated problems.
 */
const buildSignSubmit$ = (
  {
    accountId,
    accountAddresses,
    accountUtxos,
    poolId,
    target,
    wallet,
    isFinalAccount,
    recordDelegated,
  }: {
    accountId: AccountId;
    accountAddresses: CardanoPaymentAddress[];
    accountUtxos: Cardano.Utxo[];
    poolId?: EarnRewardsTarget['poolId'];
    target: EarnRewardsTarget;
    wallet: AnyWallet;
    /** Preserve mode delegates every migrated account in turn; only the last
     * one settles the wizard's step. */
    isFinalAccount: boolean;
    /** Reports THIS account's success to the run, whether or not it settles.
     * The last account decides the receipt, and it may be one that delegates
     * nothing — without this the run reports "not set up" after earlier
     * accounts were registered and charged a deposit. */
    recordDelegated: (outcome: DelegationOutcome) => void;
  },
  {
    buildEarnRewardsTx,
    confirmTx,
    submitTx,
    derivePendingActivity,
  }: {
    buildEarnRewardsTx: BuildEarnRewardsTx;
    confirmTx: ConfirmTx;
    submitTx: SubmitTx;
    derivePendingActivity: typeof derivePendingActivityFromCbor;
  },
  dependencies: SideEffectDeps,
) => {
  const { actions, logger } = dependencies;

  /**
   * Records the submitted delegation as pending, then settles.
   *
   * The activity is not cosmetic: until the certificates confirm, the
   * destination still reads as "no DRep", and the earn-rewards audience rule
   * excludes an account only on a DRep **or** a pending transaction. Without
   * this the portfolio would offer "Earn rewards" on the wallet that has just
   * delegated, for the whole submit-to-confirm window.
   */
  const settleDelegated = (txId: string, signedTx: string) => {
    // Only the last account of the run settles the step: an intermediate
    // settle would send the wizard to `done` with later accounts still
    // undelegated.
    const outcome: DelegationOutcome = {
      status: 'delegated',
      txId,
      // Only when a vote was actually delegated: with no promoted DRep
      // the set-up staked without a vote certificate, and reporting one
      // would put a delegation on the receipt that never happened.
      ...(target.dRep === undefined ? {} : { drepId: `${target.dRep.drepId}` }),
      ...(poolId === undefined ? {} : { poolId: `${poolId}` }),
    };
    recordDelegated(outcome);
    const settle$ = isFinalAccount
      ? of(actions.migrateWallet.delegationSettled({ outcome }))
      : EMPTY;
    // Derivation must never decide the outcome: the transaction is already
    // submitted by this point, so a body this cannot read is a missing row on
    // the activity list, not a delegation that failed.
    let pendingActivity;
    try {
      // The destination's own UTxOs, unlike the sweep's identical call: there
      // the destination owns none of the inputs, so [] is correct and the net
      // is genuinely incoming. Here the delegation SPENDS the destination's
      // just-swept UTxOs — with [] the derivation cannot recognise its own
      // inputs and records +change (nearly the whole balance) as an incoming
      // transfer, instead of the real −(fee + deposit).
      pendingActivity = derivePendingActivity({
        serializedTx: HexBytes(signedTx),
        accountId,
        accountAddresses,
        accountUtxos,
      });
    } catch (error) {
      logger.warn(
        '[migrate-wallet] delegation submitted but its pending activity could not be derived',
        error,
      );
    }
    return merge(
      // Recorded for EVERY account, unlike settling: the report has to be able
      // to state each destination's set-up transaction, and the outcome above
      // holds only the last one.
      of(
        actions.migrateWallet.delegationSubmitted(
          submissionOf(txId, wallet, accountId),
        ),
      ),
      pendingActivity
        ? of(
            actions.activities.upsertActivities({
              accountId,
              activities: [pendingActivity],
            }),
          )
        : EMPTY,
      settle$,
    );
  };

  // ADR-15 transparent retry, mirrored from the earn-rewards flow over the
  // same builder: the builder folds ALL failures into a result, so without the
  // unwrap-throw retryBackoff is a no-op. Safe to re-subscribe — the builder
  // is a cold defer, so each retry re-runs the whole build.
  return buildEarnRewardsTx({ accountId, poolId, dRep: target.dRep }).pipe(
    map(result => {
      if (!result.success && isRetriableError(result.error)) {
        throw result.error;
      }
      return result;
    }),
    retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
    switchMap(built => {
      if (!built.success) {
        logger.error(
          '[migrate-wallet] destination delegation build failed',
          built.error,
        );
        return pause(dependencies, 'fee-calculation');
      }

      // The executor emits its own phase actions alongside the result, so both
      // stages forward anything that is not a result rather than swallowing it
      // — those actions are what drive the signing prompt.
      // ADR-15 transparent retry. Each attempt is a FRESH submitTx call — the
      // entry point shareReplay()s per call, so re-subscribing one call
      // replays its cached failure. Re-submitting the identical signed tx is
      // idempotent at the node, which is also what keeps a retry after a
      // response-lost broadcast from double-submitting.
      const submitAttempt$ = (serializedTx: typeof built.serializedTx) =>
        submitTx(
          {
            accountId,
            serializedTx,
            blockchainName: 'Cardano',
            blockchainSpecificSendFlowData: {},
          },
          forwardExecutorResult,
        ).pipe(map(rethrowRetriableSubmission));

      return confirmTx(
        {
          accountId,
          blockchainName: 'Cardano',
          blockchainSpecificSendFlowData: {},
          serializedTx: built.serializedTx,
          wallet,
        },
        forwardExecutorResult,
      ).pipe(
        mergeMap(value => {
          if (!('success' in value)) return of(value);
          if (!value.success) {
            logger.error(
              '[migrate-wallet] destination delegation signing failed',
              value.error,
            );
            // The wallet type is the gate here that DeviceSigningError provides
            // in the sweep: only a hardware destination can raise a device
            // failure, and only then is classifying the error sound.
            return pause(
              dependencies,
              'signing',
              isHardwareWallet(wallet)
                ? classifyDeviceHint(value.error)
                : undefined,
            );
          }

          // Signed: the prompt is gone, so the screen must stop asking for it.
          const finishing$ = of(
            actions.migrateWallet.delegationPhaseChanged({
              phase: 'finishing',
            }),
          );

          const submitted$ = defer(() =>
            submitAttempt$(value.serializedTx),
          ).pipe(
            retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
            mergeMap(submitted => {
              if (!('success' in submitted)) return of(submitted);
              if (!submitted.success) {
                logger.error(
                  '[migrate-wallet] destination delegation submission failed',
                  submitted.error,
                );
                return pause(dependencies, 'submission');
              }
              return settleDelegated(submitted.txId, value.serializedTx);
            }),
          );

          return concat(finishing$, submitted$);
        }),
      );
    }),
  );
};

/**
 * Delegates the destination wallet after the sweep (the migration's condition
 * of use). A separate transaction from the sweep — the certificates bind the
 * destination's stake credential, which the sweep's source-only witnesses
 * cannot cover — but not a separate user action: the wizard owns it.
 *
 * Failure never discards the migration. The funds have already moved, so every
 * error lands on `delegationPaused`, which offers retry and finish-undelegated.
 */
export const makeRunDelegation =
  ({
    makeBuildEarnRewardsTx,
    makeConfirm = makeConfirmTx,
    makeSubmit = makeSubmitTx,
    derivePendingActivity = derivePendingActivityFromCbor,
  }: {
    makeBuildEarnRewardsTx: MakeBuildEarnRewardsTx;
    /** Injection points, like the sweep's builder: the executor correlates its
     * result by a generated id, which a test cannot know in advance, and the
     * activity derivation needs a real signed body to read. */
    makeConfirm?: typeof makeConfirmTx;
    makeSubmit?: typeof makeSubmitTx;
    derivePendingActivity?: typeof derivePendingActivityFromCbor;
  }): SideEffect =>
  (actionObservables, stateObservables, dependencies) => {
    const buildEarnRewardsTx = makeBuildEarnRewardsTx(
      dependencies as Parameters<MakeBuildEarnRewardsTx>[0],
    );
    const confirmTx = makeConfirm(actionObservables.txExecutor);
    const submitTx = makeSubmit(actionObservables.txExecutor);
    const {
      migrateWallet: { sweepSucceeded$, delegationRetryRequested$ },
    } = actionObservables;
    const {
      migrateWallet: {
        selectDestinationAccountId$,
        selectSweepTxId$,
        selectSweepProgress$,
        selectPreparedDestinationAccounts$,
        selectDiscovery$,
        selectAccountMapping$,
        selectMigrationMode$,
        selectChosenPool$,
        selectNeedsPoolChoice$,
        selectDelegationSubmissions$,
      },
      cardanoContext: { selectChainId$ },
      features: { selectLoadedFeatures$ },
    } = stateObservables;

    const settle = (outcome: DelegationOutcome) =>
      of(dependencies.actions.migrateWallet.delegationSettled({ outcome }));

    return merge(sweepSucceeded$, delegationRetryRequested$).pipe(
      withLatestFrom(
        selectDestinationAccountId$,
        selectLoadedFeatures$,
        selectChainId$,
        selectSweepTxId$,
        selectSweepProgress$,
        selectPreparedDestinationAccounts$,
        selectDiscovery$,
        selectAccountMapping$,
        selectMigrationMode$,
        selectChosenPool$,
        selectNeedsPoolChoice$,
        selectDelegationSubmissions$,
      ),
      exhaustMap(
        ([
          ,
          destinationAccountId,
          features,
          chainId,
          sweepTxId,
          sweepProgress,
          preparedDestinationAccounts,
          discovery,
          accountMapping,
          migrationMode,
          chosenPool,
          needsPoolChoice,
          delegationSubmissions,
        ]) => {
          const target = completeTargetWithChosenPool(
            resolveEarnRewardsTarget({
              featureFlags: features.featureFlags,
              chainId,
            }),
            chosenPool,
          );
          // No promoted pool + DRep for this network — including the whole
          // earn-rewards feature being off. There is nothing to delegate to, and
          // inventing a target is worse than skipping.
          if (!target || !destinationAccountId) {
            return settle({ status: 'unavailable' });
          }

          // Every transaction the sweep submitted — chunked sweeps confirm each
          // chunk before the next, so by now all of these are on-chain and any
          // one of their outputs funds the deposit + fee.
          const sweepTxIds =
            sweepProgress !== undefined &&
            sweepProgress.submittedChunks.length > 0
              ? sweepProgress.submittedChunks.map(({ txId }) => txId)
              : sweepTxId === undefined
              ? []
              : [sweepTxId];

          // Preserve mode lands funds in one destination account per source
          // account, and each is a wallet the user will stake from — so each
          // registers its own stake key. Consolidate has a single account, so
          // the loop runs once and behaves exactly as before.
          // Accounts the review disclosed as arriving WITHOUT rewards set up
          // are skipped, not attempted: their funds cannot cover a deposit, so
          // trying would pause the wizard on a shortfall the user was already
          // told about and accepted.
          //
          // Preserve only, and the mode gate is load-bearing: the disclosure is
          // computed per source account for preserve, but consolidation repoints
          // every row at the single landing index, so ONE flagged source account
          // would exclude that index — the whole consolidated balance, left
          // undelegated with nothing on screen saying so, because the no-set-up
          // row only renders in preserve.
          const unfundedDestinationIndexes = new Set(
            (migrationMode === 'preserve'
              ? discovery?.preserveUnfundedSetupAccounts ?? []
              : []
            )
              .map(
                sourceIndex =>
                  accountMapping?.find(
                    row => row.sourceAccountIndex === sourceIndex,
                  )?.destinationAccountIndex,
              )
              .filter((index): index is number => index !== undefined),
          );
          /**
           * The pool each landing account should keep, by destination account
           * index — preserve mode only, where rows map one-to-one. Consolidate
           * repoints every row at a single index, so a lookup keyed by that
           * index would pick an arbitrary source's pool out of several.
           */
          const preservedPoolByIndex = new Map<number, string>();
          if (migrationMode === 'preserve') {
            for (const row of accountMapping ?? []) {
              if (row.sourcePoolId !== undefined)
                preservedPoolByIndex.set(
                  row.destinationAccountIndex,
                  row.sourcePoolId,
                );
            }
          }
          const preservedPoolFor = (accountId: AccountId) => {
            const index = preparedDestinationAccounts?.find(
              entry => entry.accountId === accountId,
            )?.destinationAccountIndex;
            const preserved =
              index === undefined ? undefined : preservedPoolByIndex.get(index);
            return preserved === undefined
              ? undefined
              : Cardano.PoolId(preserved);
          };

          const accountsToDelegate =
            preparedDestinationAccounts !== undefined &&
            preparedDestinationAccounts.length > 0
              ? preparedDestinationAccounts
                  .filter(
                    entry =>
                      !unfundedDestinationIndexes.has(
                        entry.destinationAccountIndex,
                      ),
                  )
                  .map(entry => entry.accountId)
              : [destinationAccountId];
          // Every landing account was disclosed as unfunded for set-up: there
          // is nothing to delegate, and the done screen says so.
          if (accountsToDelegate.length === 0) {
            return settle({ status: 'undelegated' });
          }

          // Spans the whole run (the accounts are sequential and `exhaustMap`
          // admits one run at a time). The last account decides the receipt but
          // may itself delegate nothing, so its verdict has to defer to an
          // earlier account that did.
          //
          // SEEDED from the persisted submissions, not just this attempt: a
          // retry is a fresh projection, and an account whose first-attempt
          // transaction landed re-reads as delegated → `skip` → records
          // nothing. Without the seed, a retried run whose final account is a
          // declined `nothing` settled `undelegated` after earlier accounts
          // were registered, charged their deposits, and delegated.
          let delegatedOutcome: DelegationOutcome | undefined =
            delegationSubmissions !== undefined &&
            delegationSubmissions.length > 0
              ? {
                  status: 'delegated',
                  txId: delegationSubmissions[delegationSubmissions.length - 1]
                    .txId,
                }
              : undefined;

          const delegateAccount$ = (accountId: AccountId, position: number) =>
            combineLatest([
              destinationRewardInfo$(accountId, stateObservables),
              destinationFunded$(accountId, sweepTxIds, stateObservables),
              destinationWallet$(accountId, stateObservables),
              destinationAddresses$(accountId, stateObservables),
            ]).pipe(
              timeout(DISCOVERY_TIMEOUT_MS),
              take(1),
              switchMap(
                ([
                  rewardAccountInfo,
                  accountUtxos,
                  wallet,
                  accountAddresses,
                ]) => {
                  const isFinalAccount =
                    position === accountsToDelegate.length - 1;
                  const plan = delegationPlan(
                    target,
                    rewardAccountInfo,
                    preservedPoolFor(accountId),
                  );
                  // Re-read, not remembered: a retry after a submission that
                  // actually landed finds the DRep set and settles instead of
                  // registering a second time.
                  if (plan === 'skip') {
                    if (!isFinalAccount) return EMPTY;
                    return settle(
                      delegatedOutcome ?? { status: 'already-delegated' },
                    );
                  }
                  // Nothing to submit for this account. Either the builder
                  // would refuse — a vote certificate cannot reference an
                  // unregistered credential, so a fresh key with no pool has
                  // nothing to carry — or both legs are already satisfied.
                  // Building a doomed transaction would report its failure as
                  // retryable, and in the migration that lands after the sweep.
                  if (plan === 'nothing') {
                    if (!isFinalAccount) return EMPTY;
                    // The account already stakes and no vote is owed, so its
                    // rewards ARE set up — saying otherwise would send the user
                    // to a recovery action with nothing to recover.
                    if (delegatedOutcome) return settle(delegatedOutcome);
                    if (rewardAccountInfo.poolId)
                      return settle({ status: 'already-delegated' });
                    // `undelegated` — rewards are not set up and the done
                    // screen offers the recovery action — when the choice was
                    // in play: offered and declined (true), or SUPPRESSED
                    // because the landing account already staked (false) and
                    // that premise has since collapsed on-chain, or this branch
                    // could not be reached with a fresh key. `unavailable` only
                    // when the choice was never in play at all (undefined —
                    // discovery predating it): nothing was offered, so there is
                    // nothing to finish (LW-15293).
                    return settle({
                      status:
                        needsPoolChoice === undefined
                          ? 'unavailable'
                          : 'undelegated',
                    });
                  }
                  return concat(
                    // Funds settled; the next thing the user sees is the
                    // prompt — one per account being set up.
                    of(
                      dependencies.actions.migrateWallet.delegationPhaseChanged(
                        {
                          phase: 'confirming',
                          // Only when there is progress to report: a single
                          // account has no "1 of 1" to show.
                          ...(accountsToDelegate.length > 1
                            ? {
                                accountNumber: position + 1,
                                accountCount: accountsToDelegate.length,
                              }
                            : {}),
                        },
                      ),
                    ),
                    buildSignSubmit$(
                      {
                        accountId,
                        accountAddresses,
                        accountUtxos,
                        poolId: plan.poolId,
                        target,
                        wallet,
                        isFinalAccount,
                        recordDelegated: outcome => {
                          delegatedOutcome = outcome;
                        },
                      },
                      {
                        buildEarnRewardsTx,
                        confirmTx,
                        submitTx,
                        derivePendingActivity,
                      },
                      dependencies,
                    ),
                  );
                },
              ),
            );

          // Sequential: each account's transaction is signed and submitted
          // before the next is built, so the prompts queue rather than race.
          return from(
            accountsToDelegate.map((accountId, position) => ({
              accountId,
              position,
            })),
          ).pipe(
            concatMap(({ accountId, position }) =>
              delegateAccount$(accountId, position),
            ),
            catchError(error => {
              dependencies.logger.error(
                '[migrate-wallet] destination delegation failed',
                error,
              );
              return pause(dependencies, 'fee-calculation');
            }),
          );
        },
      ),
    );
  };
