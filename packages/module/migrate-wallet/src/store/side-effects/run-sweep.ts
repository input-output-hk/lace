import {
  assertTransactionCoversPinnedSet,
  assertTransactionFullySigned,
  CardanoNetworkId,
  CardanoPaymentAddress,
  derivePendingActivityFromCbor,
  isCardanoAddress,
} from '@lace-contract/cardano-context';
import {
  AuthenticationCancelledError,
  signerAuthFromPrompt,
} from '@lace-contract/signer';
import { BigNumber, HexBytes } from '@lace-lib/util';
import {
  catchError,
  combineLatest,
  concat,
  concatMap,
  defer,
  EMPTY,
  exhaustMap,
  filter,
  firstValueFrom,
  from,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
  take,
  timeout,
  toArray,
  withLatestFrom,
} from 'rxjs';

import {
  blockedWithdrawableRewards,
  buildChunkTx,
  buildSweepTx,
  chunkSweepPlan,
  chunkSweepPlanPerAccount,
  fetchRewardInfos$,
  uniqueRewardAccounts,
} from '../helpers';
import { plannedDestinationIndexes } from '../helpers/planned-destination-indexes';
import { isMigratableRow } from '../slice';

import {
  assembleSweepPlan,
  DISCOVERY_TIMEOUT_MS,
  readReviewedSweepPlan$,
  resolveResumeContext$,
} from './create-source-context';
import { deviceHintKey } from './device-hint';
import { failure } from './failure';
import {
  awaitDestinationTargets$,
  deriveMissingDestinationAccounts,
  deriveMissingDestinationAccountsOnDevice,
} from './prepare-destination-accounts';
import {
  accountIndexesRequiringSignature,
  signSweepTx,
  signSweepTxWithDevice,
  signWithAccounts,
} from './sign-sweep-tx';

import type {
  SourceContext,
  SourceContextResolver,
} from './create-source-context';
import type { PreparedDestinationAccount } from './prepare-destination-accounts';
import type { SignSweepTx } from './sign-sweep-tx';
import type { SideEffect } from '../..';
import type { SweepChunkPlan } from '../helpers';
import type { SweepPlan } from '../helpers';
import type { SweepProgress } from '../slice';
import type { Cardano, Serialization } from '@cardano-sdk/core';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { InMemoryWallet } from '@lace-contract/wallet-repo';
import type { Observable, ObservedValueOf } from 'rxjs';

/**
 * What the transaction actually did, as opposed to what the review forecast.
 *
 * The done screen previously replayed the reviewed figures, so a reward balance
 * withdrawn elsewhere on the same seed between review and sweep left the user
 * told that rewards arrived which never did — with a txId beneath it as the
 * receipt. These come off the signed body, so they state what was submitted.
 */
const sweptTotals = (signedTx: Serialization.Transaction) => {
  const body = signedTx.toCore().body;
  const withdrawnRewards = (body.withdrawals ?? []).reduce(
    (sum, withdrawal) => sum + withdrawal.quantity,
    0n,
  );
  return { fee: body.fee, withdrawnRewards };
};

// The resolved destination the sweep sends change and reports activity to: the
// change address (SR-15 same-network, guarded before build), the full address
// set for the pending-activity record, and the owning account.
type SweepTarget = {
  accountId: AccountId;
  changeAddress: CardanoPaymentAddress;
  paymentAddresses: CardanoPaymentAddress[];
};

type SideEffectDeps = Parameters<SideEffect>[2];

/**
 * FR-5 / FR-6: triggered when the user confirms the review, the sweep replays
 * the reviewed plan. For multi-chunk sweeps (FR-6), authenticates once, then
 * sequentially builds, signs, and submits each chunk. Progress is tracked via
 * `sweepChunkSubmitted` actions, and partial failures pause the sweep for
 * resume with remaining UTxOs.
 */
type ComputeChunkPlansFunction = (params: {
  utxos: Cardano.Utxo[];
  rewardInfos: SweepPlan['rewardInfos'];
  protocolParameters: SweepPlan['protocolParameters'];
  networkMagic: Cardano.NetworkMagic;
  destinationAddress: SweepPlan['destinationAddress'];
  buildTxFunction: (plan: SweepPlan) => Promise<Serialization.Transaction>;
}) => Observable<SweepChunkPlan[]>;

type SignChunkTx = (
  tx: Serialization.Transaction,
  chunk: SweepChunkPlan,
) => Observable<Serialization.Transaction>;

/**
 * Mutable progress shared between the chunk pipeline and its catchError:
 * toArray() never completes on error, so without this the store would never
 * learn which inputs were already spent on-chain. Fees accumulate across
 * chunks; the last chunk's fee alone would understate what the sweep cost.
 * Rewards do not — they ride the final chunk, so its withdrawal total is the
 * whole of them.
 */
type ChunkLedger = {
  /**
   * Carries the attribution fields, not just the tx id: `chunkFailureActions$`
   * replays these to rebuild `sweepProgress` after a part-way failure, and the
   * migration report reads that to state which source account paid which
   * transaction. Recording `{index, txId}` alone meant the report could not
   * attribute anything submitted BEFORE a pause — the partial-failure case the
   * audit exists for.
   */
  confirmedChunks: {
    index: number;
    txId: string;
    sourceAccountIndex?: number;
    destinationAccountIndex?: number;
    destinationAddress?: string;
  }[];
  feePaid: bigint;
};

/** Build → sign → submit one chunk, recording progress on the shared ledger. */
const processChunk$ = (
  {
    chunk,
    source,
    target,
    signChunkTx,
    ledger,
    assertFullySigned,
  }: {
    chunk: SweepChunkPlan;
    source: SourceContext;
    target: SweepTarget;
    signChunkTx: SignChunkTx;
    ledger: ChunkLedger;
    assertFullySigned: typeof assertTransactionFullySigned;
  },
  deps: SideEffectDeps,
) =>
  from(
    buildChunkTx({
      chunk,
      protocolParameters: source.protocolParameters,
      networkMagic: source.chainId.networkMagic,
      destinationAddress: chunk.destinationAddress ?? target.changeAddress,
    }),
  ).pipe(
    switchMap(tx => signChunkTx(tx, chunk)),
    switchMap(signedTx => {
      assertFullySigned(signedTx, chunk.utxos);
      return deps.cardanoProvider
        .submitTx(
          { signedTransaction: signedTx.toCbor() },
          { chainId: source.chainId },
        )
        .pipe(
          map(result => {
            if (result.isErr()) throw result.unwrapErr();
            const txId = result.unwrap();
            deps.logger.debug('[migrate-wallet] chunk submitted', txId);
            ledger.confirmedChunks.push({
              index: chunk.index,
              txId: `${txId}`,
              sourceAccountIndex: chunk.sourceAccountIndex,
              destinationAccountIndex: chunk.destinationAccountIndex,
              destinationAddress: chunk.destinationAddress
                ? `${chunk.destinationAddress}`
                : undefined,
            });
            ledger.feePaid += sweptTotals(signedTx).fee;
            return { txId, signedTx, chunk };
          }),
        );
    }),
  );

type SubmittedChunk = ObservedValueOf<ReturnType<typeof processChunk$>>;

/**
 * Sequential build → sign → submit over every chunk, with the per-chunk
 * signing step supplied by the wallet-type branch. toArray() collapses the
 * emissions into one array so the caller (and the root path's secret window)
 * sees a single completion after the last chunk.
 */
const signAndSubmitChunks$ = (
  {
    chunkPlans,
    source,
    target,
    signChunkTx,
    ledger,
    assertFullySigned,
  }: {
    chunkPlans: SweepChunkPlan[];
    source: SourceContext;
    target: SweepTarget;
    signChunkTx: SignChunkTx;
    ledger: ChunkLedger;
    assertFullySigned: typeof assertTransactionFullySigned;
  },
  deps: SideEffectDeps,
) =>
  from(chunkPlans).pipe(
    concatMap(chunk =>
      processChunk$(
        { chunk, source, target, signChunkTx, ledger, assertFullySigned },
        deps,
      ),
    ),
    toArray(),
  );

/**
 * Root-signed chunks: authenticate once, then sign and submit every chunk
 * inside that single accessAuthSecret window, so a sweep spanning many
 * transactions does not re-prompt per chunk (ADR 57 — one authentication
 * authorises the whole plan; the chunk count is a maxTxSize artefact, and a
 * pause would race the plan's own inputs). This deliberately widens the window
 * the accessor's "restricts to one-time auth-secret usage" comment describes —
 * the pipeline's toArray() means the zeroing tap fires once, after the last
 * signature, rather than after chunk one. Remove it and the secret dies
 * mid-plan.
 */
const signChunksWithRoot$ = (
  {
    chunkPlans,
    source,
    target,
    ledger,
    encryptedRootPrivateKey,
    assertFullySigned,
  }: {
    chunkPlans: SweepChunkPlan[];
    source: SourceContext;
    target: SweepTarget;
    ledger: ChunkLedger;
    encryptedRootPrivateKey: HexBytes;
    assertFullySigned: typeof assertTransactionFullySigned;
  },
  deps: SideEffectDeps,
) => {
  const auth = signerAuthFromPrompt(
    {
      accessAuthSecret: deps.accessAuthSecret,
      authenticate: deps.authenticate,
    },
    {
      cancellable: true,
      confirmButtonLabel: 'migrate-wallet.auth.confirm',
      message: 'migrate-wallet.auth.message',
    },
  );
  return auth.authenticate().pipe(
    switchMap(confirmed => {
      if (!confirmed) {
        throw new AuthenticationCancelledError();
      }
      return auth.accessAuthSecret(authSecret =>
        signAndSubmitChunks$(
          {
            chunkPlans,
            source,
            target,
            ledger,
            assertFullySigned,
            signChunkTx: (tx, chunk) =>
              from(
                signWithAccounts({
                  tx,
                  signingAccounts: source.signingAccounts,
                  addresses: source.addresses,
                  utxos: chunk.utxos,
                  chainId: source.chainId,
                  encryptedRootPrivateKey,
                  authSecret,
                }),
              ),
          },
          deps,
        ),
      );
    }),
  );
};

/**
 * The pending OUTGOING activity for each source account this transaction spends
 * from.
 *
 * Not cosmetic, and not the same thing as the incoming one below. A pending
 * activity is how every Cardano spend in the app reflects immediately:
 * `selectAvailableAccountUtxos` subtracts its `consumedInputs` from the
 * spending account's set. Without one for the source, the old wallet keeps
 * showing the balance it no longer has AND keeps offering those UTxOs to input
 * selection, so a send from the old wallet can be built on inputs the sweep has
 * already spent.
 *
 * Attributed per account, never to all of them: an account that paid nothing
 * must not show an outgoing transaction. When the inputs cannot be attributed
 * at all, nothing is recorded — better silent than wrong on the old wallet's
 * activity list.
 */
const sourceSpendActions = (
  {
    signedTx,
    source,
  }: { signedTx: Serialization.Transaction; source: SourceContext },
  deps: SideEffectDeps,
) => {
  const owners = accountIndexesRequiringSignature(
    signedTx,
    source.addresses,
    source.utxos,
  );
  return source.signingAccounts.flatMap(account => {
    if (!owners.has(account.accountIndex)) return [];
    const accountAddresses = source.addresses
      .filter(({ accountIndex }) => accountIndex === account.accountIndex)
      .map(({ address }) => CardanoPaymentAddress(`${address}`));
    const ownedAddresses = new Set<string>(accountAddresses);
    const pendingActivity = derivePendingActivityFromCbor({
      serializedTx: HexBytes(signedTx.toCbor()),
      accountId: account.accountId,
      accountAddresses,
      // This account's own UTxOs, so the derived change is its spend rather
      // than the whole sweep's.
      accountUtxos: source.utxos.filter(([, output]) =>
        ownedAddresses.has(`${output.address}`),
      ),
    });
    return pendingActivity
      ? [
          deps.actions.activities.upsertActivities({
            accountId: account.accountId,
            activities: [pendingActivity],
          }),
        ]
      : [];
  });
};

/**
 * The pending activities for one submitted transaction: incoming on the account
 * that receives it, outgoing on each source account that paid for it.
 *
 * Separate from success reporting because the two have different cadences: a
 * preserve-mode sweep succeeds once, at the end, but EVERY landing account has
 * a transaction to show. Sharing one gate left all but the last account blank
 * until chain sync.
 */
const pendingActivityAction$ = (
  {
    signedTx,
    target,
    chunk,
    source,
  }: {
    signedTx: Serialization.Transaction;
    target: SweepTarget;
    chunk?: SweepChunkPlan;
    source?: SourceContext;
  },
  deps: SideEffectDeps,
) => {
  const activityAccountId =
    (chunk?.destinationAccountId as AccountId | undefined) ?? target.accountId;
  const pendingActivity = derivePendingActivityFromCbor({
    serializedTx: HexBytes(signedTx.toCbor()),
    accountId: activityAccountId,
    accountAddresses: chunk?.destinationAddress
      ? [chunk.destinationAddress]
      : target.paymentAddresses,
    accountUtxos: [],
  });
  return from([
    ...(pendingActivity
      ? [
          deps.actions.activities.upsertActivities({
            accountId: activityAccountId,
            activities: [pendingActivity],
          }),
        ]
      : []),
    ...(source ? sourceSpendActions({ signedTx, source }, deps) : []),
  ]);
};

/** Emits per-chunk progress, then the sweep success on the last chunk. */
const emitChunkedProgress$ = <A>(
  {
    results,
    totalChunks,
    target,
    source,
    feePaid,
    emitSuccess$,
  }: {
    results: readonly SubmittedChunk[];
    totalChunks: number;
    target: SweepTarget;
    source: SourceContext;
    feePaid: bigint;
    emitSuccess$: (params: {
      txId: SubmittedChunk['txId'];
      signedTx: Serialization.Transaction;
      target: SweepTarget;
      source: SourceContext;
      chunk?: SweepChunkPlan;
      feeOverride: bigint;
    }) => Observable<A>;
  },
  deps: SideEffectDeps,
) =>
  from(results).pipe(
    concatMap(({ txId, signedTx, chunk }) =>
      merge(
        of(
          deps.actions.migrateWallet.sweepChunkSubmitted({
            index: chunk.index,
            txId: `${txId}`,
            totalChunks,
            sourceAccountIndex: chunk.sourceAccountIndex,
            destinationAccountIndex: chunk.destinationAccountIndex,
            destinationAddress: chunk.destinationAddress
              ? `${chunk.destinationAddress}`
              : undefined,
          }),
        ),
        // The sweep is done when its FINAL chunk lands, not when each
        // account's last one does — `isLastChunk` is per account. Every chunk
        // still records its own pending activity; only the settle is deferred.
        chunk.isFinalChunk ?? chunk.isLastChunk
          ? emitSuccess$({
              txId,
              signedTx,
              target,
              source,
              chunk,
              feeOverride: feePaid,
            })
          : pendingActivityAction$({ signedTx, target, chunk, source }, deps),
      ),
    ),
  );

/**
 * Emits chunk progress for inputs already spent on-chain before pausing, so
 * sweepProgress is set and the retry takes the resume path (fresh UTxO fetch
 * + intersection with the pinned set).
 */
const chunkFailureActions$ = (
  {
    ledger,
    totalChunks,
    error,
  }: { ledger: ChunkLedger; totalChunks: number; error?: unknown },
  deps: SideEffectDeps,
) =>
  concat(
    from(ledger.confirmedChunks).pipe(
      map(chunk =>
        deps.actions.migrateWallet.sweepChunkSubmitted({
          ...chunk,
          totalChunks,
        }),
      ),
    ),
    of(
      deps.actions.migrateWallet.sweepPaused({
        errorKey: 'migrate-wallet.error.sweep-failed',
        deviceHintKey: deviceHintKey(error),
      }),
    ),
  );

export const makeRunSweep =
  ({
    buildTxFunction = plan => from(buildSweepTx(plan)),
    signTxFunction = signSweepTx,
    resolveSourceContext = readReviewedSweepPlan$,
    resolveResumeSourceContext,
    assertFullySigned = assertTransactionFullySigned,
    assertCoversPinnedSet = assertTransactionCoversPinnedSet,
    computeChunkPlans = params => from(chunkSweepPlan(params)),
  }: {
    buildTxFunction?: (
      plan: SweepPlan,
    ) => Observable<Serialization.Transaction>;
    signTxFunction?: SignSweepTx;
    resolveSourceContext?: SourceContextResolver;
    resolveResumeSourceContext?: SourceContextResolver;
    assertFullySigned?: (
      signedTx: Serialization.Transaction,
      resolvedInputs: Cardano.Utxo[],
    ) => void;
    assertCoversPinnedSet?: typeof assertTransactionCoversPinnedSet;
    computeChunkPlans?: ComputeChunkPlansFunction;
  } = {}): SideEffect =>
  (actionObservables, stateObservables, dependencies) => {
    const {
      migrateWallet: { sweepStarted$, sweepRetryRequested$ },
    } = actionObservables;
    const {
      migrateWallet: {
        selectSourceWalletId$,
        selectSourceAccountId$,
        selectDestinationAccountId$,
        selectDestinationWalletId$,
        selectSweepProgress$,
        selectMigrationMode$,
        selectAccountMapping$,
        selectPendingHwDestinationDevice$,
        selectResolvedDestinationIndexes$,
      },
      wallets: { selectAll$: selectAllWallets$ },
      addresses: { selectByAccountId$ },
    } = stateObservables;

    const resumeResolver =
      resolveResumeSourceContext ??
      resolveResumeContext$(dependencies.cardanoProvider);

    // On success, records the pending activity on the destination and reports
    // the sweep complete.
    const emitSweepSuccess$ = ({
      txId,
      signedTx,
      target,
      source,
      chunk,
      feeOverride,
    }: {
      txId: Cardano.TransactionId;
      signedTx: Serialization.Transaction;
      target: SweepTarget;
      /** The accounts the transaction spent from, so the old wallet reflects
       * the spend rather than continuing to offer the same UTxOs. */
      source?: SourceContext;
      /** Present on the chunked path: preserve mode pays each account's own
       * landing account, so the activity belongs to that account, not the
       * sweep-wide primary. */
      chunk?: SweepChunkPlan;
      /** Fee across every chunk; omitted on the single-tx path. */
      feeOverride?: bigint;
    }) => {
      return merge(
        pendingActivityAction$(
          { signedTx, target, chunk, source },
          dependencies,
        ),
        of(
          dependencies.actions.migrateWallet.sweepSucceeded({
            txId: `${txId}`,
            ...sweptTotals(signedTx),
            ...(feeOverride === undefined ? {} : { fee: feeOverride }),
          }),
        ),
      );
    };

    // Submits the committal tx, then hands off to success reporting.
    const submitSweep$ = (
      signedTx: Serialization.Transaction,
      target: SweepTarget,
      source: SourceContext,
    ) =>
      dependencies.cardanoProvider
        .submitTx(
          { signedTransaction: signedTx.toCbor() },
          { chainId: source.chainId },
        )
        .pipe(
          mergeMap(result => {
            if (result.isErr()) throw result.unwrapErr();
            const txId = result.unwrap();
            dependencies.logger.debug('[migrate-wallet] sweep submitted', txId);
            return emitSweepSuccess$({ txId, signedTx, target, source });
          }),
        );

    // Builds and signs the pinned plan, runs the two pre-submit funds-safety
    // guards, then submits.
    const buildSignSubmit$ = (
      source: SourceContext,
      rewardInfos: SweepPlan['rewardInfos'],
      target: SweepTarget,
    ) => {
      const withdrawalRewardAccounts = rewardInfos
        .filter(info => BigNumber.valueOf(info.withdrawableAmount) > 0n)
        .map(info => info.rewardAccount);
      return buildTxFunction(
        assembleSweepPlan(source, rewardInfos, target.changeAddress),
      ).pipe(
        switchMap(tx =>
          signTxFunction(
            {
              wallet: source.wallet,
              chainId: source.chainId,
              signingAccounts: source.signingAccounts,
              addresses: source.addresses,
              utxos: source.utxos,
              dependencies,
            },
            tx,
          ),
        ),
        switchMap(signedTx => {
          // Two pre-submit funds-safety guards, both fail closed before the
          // committal submit. Coverage: the built tx spends every pinned UTxO
          // and withdraws every pinned reward account, so a builder or resolve
          // bug that drops an account cannot submit a partial sweep as success.
          // Fully-signed: every input the tx spends is witnessed, so a signing
          // gap cannot submit a tx the network rejects while a bare txId reads
          // as done.
          assertCoversPinnedSet(signedTx, {
            utxos: source.utxos,
            withdrawalRewardAccounts,
          });
          assertFullySigned(signedTx, source.utxos);
          return submitSweep$(signedTx, target, source);
        }),
      );
    };

    // Multi-chunk path (FR-6): authenticate once, then build, sign and submit
    // each chunk sequentially inside that single accessAuthSecret window, so a
    // sweep spanning many transactions does not re-prompt per chunk. Each
    // submitted chunk emits sweepChunkSubmitted; a failure part-way pauses the
    // sweep for resume rather than reporting the whole sweep done.
    const buildSignSubmitChunked$ = ({
      source,
      target,
      chunkPlans,
      deps,
    }: {
      source: SourceContext;
      target: SweepTarget;
      chunkPlans: SweepChunkPlan[];
      deps: SideEffectDeps;
    }) => {
      const encryptedRootPrivateKey = (source.wallet as InMemoryWallet)
        .blockchainSpecific.Cardano?.encryptedRootPrivateKey;
      const ledger: ChunkLedger = { confirmedChunks: [], feePaid: 0n };

      // A hardware source signs each chunk on-device: the ceremony is the
      // authorisation, so there is no app-lock prompt and no secret window to
      // hold open. One device interaction per chunk is inherent to the wallet
      // type, not a re-prompt bug.
      const signedChunkResults$ = encryptedRootPrivateKey
        ? signChunksWithRoot$(
            {
              chunkPlans,
              source,
              target,
              ledger,
              encryptedRootPrivateKey,
              assertFullySigned,
            },
            deps,
          )
        : signAndSubmitChunks$(
            {
              chunkPlans,
              source,
              target,
              ledger,
              assertFullySigned,
              signChunkTx: (tx, chunk) =>
                signSweepTxWithDevice(
                  {
                    wallet: source.wallet,
                    signingAccounts: source.signingAccounts,
                    addresses: source.addresses,
                    utxos: chunk.utxos,
                    dependencies: deps,
                  },
                  tx,
                ),
            },
            deps,
          );

      return signedChunkResults$.pipe(
        switchMap(results =>
          emitChunkedProgress$(
            {
              results,
              totalChunks: chunkPlans.length,
              target,
              source,
              // Read after toArray() completed, so this is the whole plan's fee.
              feePaid: ledger.feePaid,
              emitSuccess$: emitSweepSuccess$,
            },
            deps,
          ),
        ),
        catchError(error => {
          // A dismissed prompt is not a failure: no chunk was built, signed or
          // submitted, so pausing here would offer "Try again" for a sweep that
          // never started. Only reachable with nothing submitted — the prompt
          // is raised once, before the first chunk.
          if (error instanceof AuthenticationCancelledError) {
            return of(deps.actions.migrateWallet.sweepAuthCancelled());
          }
          deps.logger.error('[migrate-wallet] chunk sweep failed', error);
          return chunkFailureActions$(
            { ledger, totalChunks: chunkPlans.length, error },
            deps,
          );
        }),
      );
    };

    // Re-check reward eligibility at sweep, not only at discovery. A first
    // reward can appear after review (an epoch tick in the window) on a stake
    // key with no vote delegation at all, and the builder would then add a
    // withdrawal the node rejects (ConwayWdrlNotDelegatedToDRep). Any DRep —
    // sentinel or specific — satisfies the ledger rule. Refuse here matching
    // the discovery verdict rather than submit a permanently-invalid tx.
    // Terminal, not retryable: eligibility cannot change on retry.
    const rewardsBlockedAction = (rewardInfos: SweepPlan['rewardInfos']) => {
      const blocked = blockedWithdrawableRewards(rewardInfos);
      if (blocked <= 0n) return undefined;
      return dependencies.actions.migrateWallet.migrationUnsupported({
        errorKey: 'migrate-wallet.error.rewards-not-vote-delegated',
        amount: {
          value: `${blocked}`,
          labelKey: 'migrate-wallet.unsupported.stuck-rewards',
        },
      });
    };

    // Re-fetches reward amounts, checks eligibility, computes chunk plans,
    // then delegates to single or multi-chunk submission.
    const sweepReviewedSource$ = (
      source: SourceContext,
      target: SweepTarget,
      options?: {
        sweepProgress?: SweepProgress;
        destinationByAccountIndex?: Map<
          number,
          { address: CardanoPaymentAddress; accountId: string }
        >;
      },
    ) => {
      const { sweepProgress, destinationByAccountIndex } = options ?? {};
      return fetchRewardInfos$(
        uniqueRewardAccounts(source.addresses),
        source.chainId,
        dependencies.cardanoProvider,
      ).pipe(
        switchMap(rewardInfos => {
          const blocked = rewardsBlockedAction(rewardInfos);
          if (blocked) return of(blocked);

          // No UTxOs left. Success is claimed only when OUR submissions
          // account for that — every planned chunk on-chain, so the last one
          // is the receipt. Anything short of that means the pinned inputs
          // vanished without us spending them all: something else spent them,
          // and on a flow the user entered because they believe their phrase
          // is compromised, that something else is plausibly an attacker
          // holding the same keys. "We submitted some" is not enough — a
          // partial submit plus an empty provider read must not report the
          // unswept remainder as arrived.
          if (source.utxos.length === 0) {
            const lastSubmitted = sweepProgress?.submittedChunks.at(-1);
            const isEveryChunkSubmitted =
              sweepProgress !== undefined &&
              sweepProgress.submittedChunks.length ===
                sweepProgress.totalChunks;
            if (!lastSubmitted || !isEveryChunkSubmitted) {
              return failure(dependencies, 'migrate-wallet.error.sweep-failed');
            }
            return of(
              dependencies.actions.migrateWallet.sweepSucceeded({
                txId: lastSubmitted.txId,
              }),
            );
          }

          // Preserve mode plans one chunk set per source account, each paying
          // its own destination; consolidation keeps the sweep-wide target.
          const chunkPlans$ = destinationByAccountIndex
            ? from(
                chunkSweepPlanPerAccount({
                  utxos: source.utxos,
                  rewardInfos,
                  addresses: source.addresses.map(
                    ({ address, accountIndex, rewardAccount }) => ({
                      address: `${address}`,
                      accountIndex,
                      rewardAccount: `${rewardAccount}`,
                    }),
                  ),
                  protocolParameters: source.protocolParameters,
                  networkMagic: source.chainId.networkMagic,
                  destinationByAccountIndex,
                  buildTxFunction: async plan =>
                    firstValueFrom(buildTxFunction(plan)),
                }),
              )
            : computeChunkPlans({
                utxos: source.utxos,
                rewardInfos,
                protocolParameters: source.protocolParameters,
                networkMagic: source.chainId.networkMagic,
                destinationAddress: target.changeAddress,
                buildTxFunction: async plan =>
                  firstValueFrom(buildTxFunction(plan)),
              });
          return chunkPlans$.pipe(
            switchMap(chunkPlans => {
              if (chunkPlans.length === 1 && !destinationByAccountIndex) {
                return buildSignSubmit$(source, rewardInfos, target);
              }
              return buildSignSubmitChunked$({
                source,
                target,
                chunkPlans,
                deps: dependencies,
              });
            }),
          );
        }),
      );
    };

    // Unlike the pre-submit watchers, the sweep is intentionally NOT torn down
    // on wizardCancelled: the `sweeping` step has no cancel affordance, and once
    // submitTx has fired the transaction is committal — dropping the success
    // handling would leave funds moved with the wizard unaware.
    return merge(sweepStarted$, sweepRetryRequested$).pipe(
      withLatestFrom(
        selectSourceWalletId$,
        selectSourceAccountId$,
        selectDestinationAccountId$,
        selectSweepProgress$,
        selectMigrationMode$,
        selectAccountMapping$,
        selectDestinationWalletId$,
        selectAllWallets$,
        selectPendingHwDestinationDevice$,
        selectResolvedDestinationIndexes$,
      ),
      exhaustMap(
        ([
          action,
          sourceWalletId,
          sourceAccountId,
          destinationAccountId,
          sweepProgress,
          migrationMode,
          accountMapping,
          destinationWalletId,
          allWallets,
          pendingHwDestinationDevice,
          resolvedDestinationIndexes,
        ]) => {
          if (!sourceWalletId || !sourceAccountId || !destinationAccountId) {
            return failure(dependencies, 'migrate-wallet.error.sweep-failed');
          }

          const isResume =
            action.type.endsWith('sweepRetryRequested') &&
            sweepProgress != null;

          // For resume: use the resume resolver that fetches fresh UTxOs and
          // intersects with the pinned set. For initial: use the reviewed plan.
          const sourceContext$ = isResume
            ? resumeResolver(
                { sourceWalletId, sourceAccountId },
                stateObservables,
              )
            : resolveSourceContext(
                { sourceWalletId, sourceAccountId },
                stateObservables,
              );

          // Which destination accounts this run needs: preserve, every mapping
          // row's; consolidate, the first row's alone (for an existing
          // destination that is a FRESH account, so migrated funds never
          // mingle with history the wallet already has). No mapping (legacy
          // resume from an older run) falls back to the picked account.
          const destinationWallet = allWallets.find(
            wallet => wallet.walletId === destinationWalletId,
          );
          // Every account lookup and derivation below is scoped to the network
          // the picked destination account is on: the same index exists on
          // every network the wallet was created for.
          const destinationNetworkId = destinationWallet?.accounts.find(
            account => account.accountId === destinationAccountId,
          )?.blockchainNetworkId;
          const planned = plannedDestinationIndexes({
            accountMapping,
            migrationMode,
          });
          // `undefined`, not `[]`: downstream reads absence as "no plan, use
          // the account the user picked", which an empty list would not say.
          const plannedIndexes = planned.length === 0 ? undefined : planned;
          const destinationIndexesOnNetwork = new Set(
            (destinationWallet?.accounts ?? [])
              .filter(
                account =>
                  account.blockchainName === 'Cardano' &&
                  account.blockchainNetworkId === destinationNetworkId,
              )
              .map(
                account =>
                  (account.blockchainSpecific as { accountIndex?: number })
                    ?.accountIndex ?? 0,
              ),
          );
          // A resume whose first attempt already persisted the landing accounts
          // needs nothing created — only their addresses. Asking about creation
          // ability at all in that case is what made a reconnect look required.
          const hasAccountsToCreate = (plannedIndexes ?? []).some(
            index => !destinationIndexesOnNetwork.has(index),
          );
          // Can this run create accounts at all? A software destination derives
          // them from its root; a hardware one only with the device captured at
          // the mode choice, which preserve collects and consolidate does not.
          const canCreateAccounts =
            Boolean(
              (destinationWallet as InMemoryWallet | undefined)
                ?.blockchainSpecific?.Cardano?.encryptedRootPrivateKey,
            ) || pendingHwDestinationDevice !== undefined;
          // Preserve mode must NOT degrade into the flat single-destination
          // path when the plan is out of reach: that path co-spends every
          // source account into the one picked account, linking exactly the
          // accounts the mode exists to keep apart — and it did so silently,
          // after the review promised otherwise. Refuse and ask for the device
          // back instead. Consolidate is unaffected: its one landing account
          // IS the picked account, so the fallback is what it asked for.
          if (
            migrationMode === 'preserve' &&
            plannedIndexes !== undefined &&
            hasAccountsToCreate &&
            !canCreateAccounts
          ) {
            return failure(
              dependencies,
              'migrate-wallet.error.destination-device-required',
            );
          }
          const neededIndexes =
            plannedIndexes === undefined ||
            // Consolidate into a hardware destination: the planned fresh
            // account cannot be created, so fall back to the picked one.
            (hasAccountsToCreate && !canCreateAccounts)
              ? undefined
              : plannedIndexes;
          // One line that says which path this run takes: the field reports
          // above are all indirect, and a run that silently skips derivation
          // looks identical to one with nothing to derive.
          dependencies.logger.warn(
            '[migrate-wallet] sweep destination plan',
            JSON.stringify({
              migrationMode,
              mappingRows: accountMapping?.length,
              plannedIndexes: accountMapping?.map(
                row => row.destinationAccountIndex,
              ),
              hasDestinationDevice: pendingHwDestinationDevice !== undefined,
              destinationWalletType: destinationWallet?.type,
              destinationNetworkId: `${destinationNetworkId}`,
              existingDestinationIndexes: destinationWallet?.accounts
                .filter(
                  account =>
                    account.blockchainName === 'Cardano' &&
                    account.blockchainNetworkId === destinationNetworkId,
                )
                .map(
                  account =>
                    (account.blockchainSpecific as { accountIndex?: number })
                      ?.accountIndex,
                ),
            }),
          );

          type PreparedEmission =
            | PreparedDestinationAccount[]
            | ReturnType<typeof dependencies.actions.wallets.updateWallet>
            | undefined;
          const prepared$: Observable<PreparedEmission> =
            neededIndexes === undefined || destinationWallet === undefined
              ? of(undefined)
              : defer(async () =>
                  // Nothing to create — a resume over accounts the first
                  // attempt persisted. Neither derivation path is entered, so
                  // no root and no device are touched: the run only needs the
                  // addresses of accounts that already exist. Skipping the
                  // device probe is also what keeps the freshness check honest,
                  // since these accounts were already probed when created.
                  !hasAccountsToCreate
                    ? { accounts: [], resolvedIndexes: neededIndexes }
                    : // A hardware destination exports its new account keys from
                    // the device the user connected at the mode choice — one
                    // approval each. Everything else derives from its root.
                    pendingHwDestinationDevice
                    ? deriveMissingDestinationAccountsOnDevice(
                        {
                          wallet: destinationWallet,
                          destinationAccountIndexes: neededIndexes,
                          blockchainNetworkId: destinationNetworkId,
                          device: pendingHwDestinationDevice,
                          // Settled before the review; re-probing would repeat
                          // a device round-trip per account and could disagree
                          // with the accounts the review named.
                          preResolvedIndexes: resolvedDestinationIndexes,
                        },
                        dependencies,
                      )
                    : deriveMissingDestinationAccounts(
                        {
                          wallet: destinationWallet,
                          destinationAccountIndexes: neededIndexes,
                          blockchainNetworkId: destinationNetworkId,
                        },
                        dependencies,
                      ),
                ).pipe(
                  switchMap(({ accounts: newAccounts, resolvedIndexes }) => {
                    const walletWithNew = {
                      ...destinationWallet,
                      accounts: [...destinationWallet.accounts, ...newAccounts],
                    } as typeof destinationWallet;
                    const persist$ =
                      newAccounts.length === 0
                        ? EMPTY
                        : of(
                            dependencies.actions.wallets.updateWallet({
                              id: destinationWallet.walletId,
                              changes: {
                                accounts: walletWithNew.accounts,
                              } as never,
                            }),
                          );
                    return concat(
                      persist$,
                      awaitDestinationTargets$(
                        {
                          wallet: walletWithNew,
                          // What the probe settled on, not what was planned:
                          // a planned index the probe found used on chain was
                          // skipped, and its account was never created.
                          destinationAccountIndexes: resolvedIndexes,
                          blockchainNetworkId: destinationNetworkId,
                        },
                        stateObservables,
                      ).pipe(timeout(DISCOVERY_TIMEOUT_MS)),
                    );
                  }),
                );

          const destinationAddresses$ = selectByAccountId$.pipe(
            map(selectByAccountId =>
              selectByAccountId(destinationAccountId).filter(isCardanoAddress),
            ),
            filter(addresses => addresses.length > 0),
            take(1),
            timeout(DISCOVERY_TIMEOUT_MS),
          );

          return prepared$.pipe(
            switchMap(preparedOrAction => {
              // Actions (the wallet update) pass straight through to dispatch.
              if (
                preparedOrAction !== undefined &&
                !Array.isArray(preparedOrAction)
              ) {
                return of(preparedOrAction);
              }
              const prepared = preparedOrAction;
              const primary = prepared?.[0];

              const target$ = primary
                ? of({
                    accountId: primary.accountId,
                    changeAddress: CardanoPaymentAddress(primary.address),
                    paymentAddresses: [CardanoPaymentAddress(primary.address)],
                    // The destination wallet's own network, resolved to the
                    // same 0/1 the source chain id carries, so the guard below
                    // can compare both paths. Was `undefined`, which combined
                    // with the guard's `!primary` to skip the check entirely on
                    // the prepared path — i.e. always.
                    networkId: CardanoNetworkId.getChainId(
                      destinationNetworkId as Parameters<
                        typeof CardanoNetworkId.getChainId
                      >[0],
                    )?.networkId as unknown,
                    // ALWAYS recorded, even when the primary is the account the
                    // picker already named (a fresh destination): this is how
                    // the delegation learns about accounts 1+. Gating it on the
                    // re-point left every later account unregistered while the
                    // wizard reported success.
                    repointAction:
                      dependencies.actions.migrateWallet.destinationAccountsPrepared(
                        {
                          accounts: prepared.map(entry => ({
                            destinationAccountIndex:
                              entry.destinationAccountIndex,
                            accountId: entry.accountId,
                          })),
                        },
                      ),
                  })
                : destinationAddresses$.pipe(
                    map(destinationAddresses => ({
                      accountId: destinationAccountId,
                      changeAddress: CardanoPaymentAddress(
                        destinationAddresses[0].address,
                      ),
                      paymentAddresses: destinationAddresses.map(
                        ({ address }) => CardanoPaymentAddress(address),
                      ),
                      networkId: destinationAddresses[0].data?.networkId,
                      repointAction: undefined,
                    })),
                  );

              // Preserve mode keys destinations by SOURCE account index.
              const fundedRows = accountMapping?.filter(isMigratableRow) ?? [];
              // Paired BY POSITION against the funded rows, and only when the
              // two line up exactly.
              //
              // Position, not the planned destination index: the freshness
              // probe can land a row on a DIFFERENT index than the plan named
              // (planned 0 and 1 found used on chain resolve to 2 and 3), so an
              // index lookup finds nothing for every row and the whole mapping
              // comes back empty. `prepared` is one entry per requested index,
              // in request order, which is the only thing that survives a
              // remap.
              //
              // What made position pairing unsafe was a SHORT `prepared` list —
              // already-loaded indexes were dropped from it — which shifted
              // every row onto the next row's account. The length check is the
              // guard that was missing, so a list that does not correspond
              // fails the sweep instead of mis-routing it, before anything is
              // signed.
              const isPairedWithFundedRows =
                prepared?.length === fundedRows.length;
              if (
                prepared !== undefined &&
                migrationMode === 'preserve' &&
                !isPairedWithFundedRows
              ) {
                return failure(
                  dependencies,
                  'migrate-wallet.error.destination-accounts-unavailable',
                );
              }
              const destinationBySourceIndex =
                prepared && migrationMode === 'preserve'
                  ? new Map(
                      fundedRows.map((row, position) => {
                        const entry = prepared[position];
                        return [
                          row.sourceAccountIndex,
                          {
                            address: CardanoPaymentAddress(entry.address),
                            accountId: `${entry.accountId}`,
                            accountIndex: entry.destinationAccountIndex,
                          },
                        ] as const;
                      }),
                    )
                  : undefined;

              return combineLatest([sourceContext$, target$]).pipe(
                switchMap(([source, target]) => {
                  // SR-15: the change address must belong to the destination
                  // account and both accounts are on the same network.
                  //
                  // Both paths, and an unresolved network fails too. The
                  // prepared path used to carry `networkId: undefined` and the
                  // guard was gated on `!primary`, so between them the check
                  // never ran on the path that actually signs. Switching the
                  // active network mid-wizard could then sign a mainnet
                  // transaction paying preprod-derived addresses.
                  if (target.networkId !== source.chainId.networkId) {
                    return failure(
                      dependencies,
                      'migrate-wallet.error.network-mismatch',
                    );
                  }
                  return concat(
                    target.repointAction ? of(target.repointAction) : EMPTY,
                    sweepReviewedSource$(source, target, {
                      sweepProgress,
                      destinationByAccountIndex: destinationBySourceIndex,
                    }),
                  );
                }),
              );
            }),
            catchError(error =>
              // Covers the single-transaction path, which is the common one:
              // chunking is the exception, so without this the usual dismissed
              // prompt still reads as a sweep that failed.
              error instanceof AuthenticationCancelledError
                ? of(dependencies.actions.migrateWallet.sweepAuthCancelled())
                : failure(
                    dependencies,
                    'migrate-wallet.error.sweep-failed',
                    error,
                  ),
            ),
          );
        },
      ),
    );
  };
