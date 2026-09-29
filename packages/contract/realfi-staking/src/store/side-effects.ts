import { Serialization } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { TokenId } from '@lace-contract/tokens';
import {
  makeConfirmTx,
  makeSubmitTx,
  pendingActivityMetadata,
} from '@lace-contract/tx-executor';
import { BigNumber, Ok, Timestamp } from '@lace-lib/util';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { retryBackoff } from 'backoff-rxjs';
import {
  EMPTY,
  TimeoutError,
  catchError,
  combineLatest,
  concat,
  distinctUntilChanged,
  exhaustMap,
  filter,
  from,
  ignoreElements,
  map,
  merge,
  mergeMap,
  of,
  pairwise,
  skip,
  switchMap,
  take,
  tap,
  timeout,
  withLatestFrom,
} from 'rxjs';

import {
  REALFI_FLOW_EVENT_NAME,
  USDR_DECIMALS,
  baseUnitsToNumber,
  getFlowAnalyticsContext,
} from '../flow-analytics';
import { realfiDebugLog } from '../realfi-debug-log';
import {
  getRealFiConfigFromFlags,
  isLaunchSeasonActive,
} from '../realfi-network-config';
import { RealFiStakeId } from '../value-objects';

import type { SideEffect } from '../contract';
import type {
  RealFiBundledTransaction,
  RealFiErrorCode,
  RealFiSorQuote,
  RealFiSorQuoteRequest,
  RealFiStakeActivity,
  RealFiWithdrawableUnstake,
} from '../provider-types';
import type { RealFiFlowState, RealFiReview } from './types';
import type { AccountId } from '@lace-contract/wallet-repo';

const TX_TTL_SECONDS = 900;
// How long a quote waits for wallet data (UTxOs, address, protocol params)
// before failing with an explicit reason.
const QUOTE_DEPENDENCY_WAIT_MS = 15_000;
// Ceiling on the attribution claim, which the finalize arm awaits between
// signing and broadcast. Load-bearing, not tuning: the claim's failures are
// already waived, but a request that never settles (a hung Blockfrost
// protocol-version read, a hung RealFi claim) emits no error for
// `retryBackoff` to act on, so without a bound the claim never completes,
// `concat` never reaches the submit, and an ALREADY-SIGNED transaction is
// never broadcast — wedging the flow in SubmittingTransaction. Covers every
// retry, since it sits downstream of `retryBackoff`.
const ATTRIBUTION_CLAIM_WAIT_MS = 10_000;
const ERROR_KEY = 'realfi.error.title' as const;

/** User-surfaceable message of a failure, when the shape carries one. */
const detailOf = (error: unknown): string | undefined => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return undefined;
};

/**
 * Base-unit amount → en-US string. This is a PERSISTED fallback only: the row
 * carries `usdrBaseUnits` for locale-correct render-time formatting; this
 * string exists so a legacy consumer that reads `subtitle` still shows an
 * amount. New surfaces localize from `usdrBaseUnits` instead (P3-h).
 */
const formatUsdrAmount = (baseUnits: string): string =>
  (Number(baseUnits) / 10 ** USDR_DECIMALS).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: USDR_DECIMALS,
  });

/**
 * One optimistic "Withdraw" history row per claimed timelock. Ids match the
 * timelock UTxO so repeat records dedupe. Recorded when the claim is signed
 * because the off-chain read can't surface a completed withdrawal. The row
 * PERSISTS, so its display fields must localize at render: the title comes
 * from `kind` and the amount from `usdrBaseUnits` (P3-h). `label`/`subtitle`
 * are inert en-US fallbacks for any consumer that hasn't adopted those.
 */
const toWithdrawActivities = (
  unstakes: RealFiWithdrawableUnstake[],
  recordedAt: number,
): RealFiStakeActivity[] =>
  unstakes.map(unstake => ({
    id: `${unstake.timelockUtxo.txHash}#${unstake.timelockUtxo.index}-withdraw`,
    kind: 'withdraw',
    label: 'Withdrawal',
    subtitle: `+${formatUsdrAmount(unstake.usdrAmount)} USDrf`,
    usdrBaseUnits: unstake.usdrAmount,
    completed: true,
    requestDate: recordedAt,
    // Withdrawal releases USDr to the wallet (not sUSDr) — its own step key so
    // the detail sheet reads "Receive USDrf".
    steps: [{ key: 'withdrawn', status: 'completed' }],
  }));

const passResult = <T>(value: T): T => value;

// Code-unit order, deliberately not localeCompare: the timelock key is a
// canonical identity and must not vary with the runtime locale.
const byCodeUnit = (a: string, b: string): number => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

/**
 * Canonical identity of a claim's timelock set — pairs the sheet's fee quote
 * to the confirm that must sign the same tx.
 */
const timelockKeyOf = (unstakes: RealFiWithdrawableUnstake[]): string =>
  unstakes
    .map(u => `${u.timelockUtxo.txHash}#${u.timelockUtxo.index}`)
    .sort(byCodeUnit)
    .join(',');

const sumUsdrBaseUnits = (unstakes: RealFiWithdrawableUnstake[]): string =>
  unstakes.reduce((sum, item) => sum + BigInt(item.usdrAmount), 0n).toString();

/**
 * Claim lifecycle analytics payload (LW-15494). The claim releases USDr, so
 * `usd_value` reports the USD-pegged amount — no price cache involved.
 */
const claimAnalyticsPayload = (unstakes: RealFiWithdrawableUnstake[]) => {
  const usdrAmount = baseUnitsToNumber(
    sumUsdrBaseUnits(unstakes),
    USDR_DECIMALS,
  );
  return {
    tx_type: 'claim' as const,
    ...(usdrAmount !== undefined && {
      usdr_amount: usdrAmount,
      usd_value: usdrAmount,
    }),
  };
};

/**
 * How long a dry-run-built claim tx may be signed as-is. Well inside the
 * built tx's own validity window (tip + 7200 slots); past this, confirm
 * rebuilds so a long-idle sheet never submits against a moved chain tip.
 */
const WITHDRAW_QUOTE_REUSE_MS = 2 * 60_000;

const toReview = (quote: RealFiSorQuote): RealFiReview => ({
  quote,
  estimatedOutput: quote.estimatedOutput,
  route: quote.route,
  priceImpact: quote.priceImpact,
  networkFee: quote.networkFee,
  processingFee: quote.processingFee,
  serviceFee: quote.serviceFee,
  serviceFeeTokenId: quote.serviceFeeTokenId,
  quoteExpiresAt: quote.quoteExpiresAt,
});

/**
 * Quote arm: Preparing → getSorQuote → ReviewingTransaction (spec §4.5, M3/M6).
 * Only stake/unstake produce SOR quotes; claim/cancel skip straight to signing
 * in the gated milestones. Transparent retry (ADR-15) on the network op.
 */
export const makeQuote: SideEffect = (
  _,
  {
    realfiFlow: { selectFlowState$ },
    addresses: { selectByAccountId$ },
    network: { selectActiveNetworkId$ },
    features: { selectLoadedFeatures$ },
    cardanoContext: { selectAvailableAccountUtxos$, selectProtocolParameters$ },
  },
  { actions, realfiProviders },
) => {
  // Quote failure is user-visible: fail the flow with the provider's own
  // message so the Manage Stake sheet can say WHAT failed inline (no toast —
  // sanitized at render like the swap center). The alternative (a silent
  // fallback quote) shows invented numbers on a real transaction.
  const quoteFailure = (errorDetail?: string, errorCode?: RealFiErrorCode) =>
    from([
      actions.realfiFlow.reviewFailed({
        errorMessage: ERROR_KEY,
        // Compliance refusals render fully translated state-specific copy from
        // the code; the raw handshake text would only duplicate it.
        errorDetail: errorCode?.startsWith('COMPLIANCE_')
          ? undefined
          : errorDetail,
        errorCode,
      }),
    ]);
  return firstStateOfStatus(selectFlowState$, 'Preparing').pipe(
    withLatestFrom(selectActiveNetworkId$, selectLoadedFeatures$),
    switchMap(([state, selectActiveNetworkId, loadedFeatures]) => {
      const provider = realfiProviders[0];
      // Resolve the active network's RealFi config from the REALFI flag
      // payload; unavailable networks quote-fail rather than hit the wrong one.
      const config = getRealFiConfigFromFlags(
        loadedFeatures.featureFlags,
        selectActiveNetworkId('Cardano'),
      );
      // Structural refusals that no waiting can heal — each carries its reason
      // (a bare "couldn't fetch a quote" hides what to fix).
      if (!provider) return quoteFailure('RealFi provider unavailable');
      if (!config) {
        return quoteFailure('RealFi is not enabled on this network');
      }
      // Narrow into a const so the closures below keep the narrowing.
      const kind = state.kind;
      if (kind !== 'stake' && kind !== 'unstake') {
        return quoteFailure(`No quote exists for a ${kind} flow`);
      }
      // UTxOs, the account address and protocol parameters feed the dry-run
      // build that prices the quote's exact network fee. They load
      // asynchronously, so WAIT for them instead of failing a snapshot: a
      // freshly opened sheet's first quote routinely beats the wallet sync,
      // and a snapshot failure would stick (nothing re-quotes when the data
      // lands). The timeout keeps a truly-empty wallet from pending forever.
      return combineLatest([
        selectByAccountId$,
        selectAvailableAccountUtxos$,
        selectProtocolParameters$,
      ]).pipe(
        map(([selectByAccountId, availableAccountUtxos, params]) => ({
          userAddress: selectByAccountId(state.accountId)[0]?.address ?? '',
          accountUtxos: availableAccountUtxos[state.accountId] ?? [],
          protocolParameters: params,
        })),
        filter(
          deps =>
            deps.userAddress !== '' &&
            deps.accountUtxos.length > 0 &&
            deps.protocolParameters !== undefined,
        ),
        take(1),
        timeout(QUOTE_DEPENDENCY_WAIT_MS),
        switchMap(({ userAddress, accountUtxos, protocolParameters }) => {
          const request: RealFiSorQuoteRequest = {
            config,
            accountId: state.accountId,
            userAddress,
            kind,
            inputTokenId: state.inputTokenId,
            outputTokenId: state.outputTokenId,
            inputAmount: state.inputAmount,
            utxos: accountUtxos.map(utxo =>
              Serialization.TransactionUnspentOutput.fromCore(utxo).toCbor(),
            ),
            // The readiness filter above guarantees presence.
            protocolParameters: protocolParameters as NonNullable<
              typeof protocolParameters
            >,
            ttl: TX_TTL_SECONDS,
          };
          realfiDebugLog('quote: requested', {
            kind: state.kind,
            accountId: state.accountId,
            inputTokenId: state.inputTokenId,
            outputTokenId: state.outputTokenId,
            inputAmount: state.inputAmount,
            utxoCount: accountUtxos.length,
            userAddress,
          });
          return provider.getSorQuote(request).pipe(
            retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
            mergeMap(result => {
              if (result.isOk()) {
                realfiDebugLog('quote: received', { quote: result.value });
                return of(
                  actions.realfiFlow.reviewReceived({
                    review: toReview(result.value),
                  }),
                );
              }
              realfiDebugLog('quote: FAILED', { error: result.error });
              return quoteFailure(result.error.message, result.error.code);
            }),
          );
        }),
        catchError(error => {
          realfiDebugLog('quote: pipeline ERROR', { error });
          return quoteFailure(
            error instanceof TimeoutError
              ? 'Wallet data (balance and network parameters) did not load in time'
              : detailOf(error),
          );
        }),
      );
    }),
  );
};

/**
 * Build arm: SigningTransaction → buildBundledTx (real preview swap→stake order,
 * balanced unsigned tx) → SubmittingTransaction (spec §4.5/§4.7, M3). The order
 * owner + change address come from the active account's first address; the
 * wallet is carried forward so the finalize arm can sign + submit. Signing is
 * prompted by the tx-executor `confirmTx` (finalize arm), so no separate auth
 * prompt is needed here. Transparent retry (ADR-15) on the build op.
 */
export const makeBuild: SideEffect = (
  _,
  {
    realfiFlow: { selectFlowState$ },
    wallets: { selectAll$ },
    addresses: { selectByAccountId$ },
    network: { selectActiveNetworkId$ },
    features: { selectLoadedFeatures$ },
    cardanoContext: { selectAvailableAccountUtxos$, selectProtocolParameters$ },
  },
  { actions, realfiProviders },
) =>
  firstStateOfStatus(selectFlowState$, 'SigningTransaction').pipe(
    withLatestFrom(
      selectAll$,
      selectByAccountId$,
      selectActiveNetworkId$,
      selectLoadedFeatures$,
      selectAvailableAccountUtxos$,
      selectProtocolParameters$,
    ),
    switchMap(
      ([
        state,
        wallets,
        selectByAccountId,
        selectActiveNetworkId,
        loadedFeatures,
        availableAccountUtxos,
        protocolParameters,
      ]) => {
        const provider = realfiProviders[0];
        const config = getRealFiConfigFromFlags(
          loadedFeatures.featureFlags,
          selectActiveNetworkId('Cardano'),
        );
        // Strictly the wallet owning the account — no fallback: signing with
        // an arbitrary wallet would fail (or worse, spend from the wrong one);
        // absence routes into the guard's explicit failure below.
        const wallet = wallets.find(w =>
          w.accounts.some(a => a.accountId === state.accountId),
        );
        const userAddress = selectByAccountId(state.accountId)[0]?.address;
        const accountUtxos = availableAccountUtxos[state.accountId] ?? [];
        realfiDebugLog('build: side-effect fired', {
          kind: state.kind,
          accountId: state.accountId,
          inputTokenId: state.inputTokenId,
          outputTokenId: state.outputTokenId,
          inputAmount: state.inputAmount,
          hasProvider: !!provider,
          hasConfig: !!config,
          hasWallet: !!wallet,
          userAddress,
          hasProtocolParameters: !!protocolParameters,
          accountUtxoCount: accountUtxos.length,
          ttlSeconds: TX_TTL_SECONDS,
        });
        if (
          !provider ||
          !config ||
          !wallet ||
          !userAddress ||
          !protocolParameters ||
          accountUtxos.length === 0
        ) {
          realfiDebugLog('build: missing dependency — failing flow', {
            hasProvider: !!provider,
            hasConfig: !!config,
            hasWallet: !!wallet,
            hasAddress: !!userAddress,
            hasProtocolParameters: !!protocolParameters,
            accountUtxoCount: accountUtxos.length,
          });
          return of(
            actions.realfiFlow.submissionFailed({ errorMessage: ERROR_KEY }),
          );
        }
        return provider
          .buildBundledTx({
            config,
            quote: state.review.quote,
            userAddress,
            inputTokenId: state.inputTokenId,
            outputTokenId: state.outputTokenId,
            utxos: accountUtxos.map(utxo =>
              Serialization.TransactionUnspentOutput.fromCore(utxo).toCbor(),
            ),
            collateralUtxos: [],
            protocolParameters,
            ttl: TX_TTL_SECONDS,
          })
          .pipe(
            retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
            map(result => {
              if (result.isOk()) {
                realfiDebugLog('build: ok → submissionStarted', {
                  cborLength: result.value.unsignedTxCbor.length,
                  unsignedTxCbor: result.value.unsignedTxCbor,
                  orderOutputIndex: result.value.orderOutputIndex,
                });
                return actions.realfiFlow.submissionStarted({
                  serializedTx: result.value.unsignedTxCbor,
                  orderOutputIndex: result.value.orderOutputIndex,
                });
              }
              realfiDebugLog('build: FAILED', { error: result.error });
              return actions.realfiFlow.submissionFailed({
                errorMessage: ERROR_KEY,
                errorDetail: result.error.code.startsWith('COMPLIANCE_')
                  ? undefined
                  : result.error.message,
                errorCode: result.error.code,
              });
            }),
            catchError(error => {
              realfiDebugLog('build: pipeline ERROR', { error });
              return of(
                actions.realfiFlow.submissionFailed({
                  errorMessage: ERROR_KEY,
                  errorDetail: detailOf(error),
                }),
              );
            }),
          );
      },
    ),
  );

/**
 * Finalize arm: SubmittingTransaction → tx-executor confirm (sign) → submit
 * (broadcast) → Queued (spec §4.5/§4.7, M3). Uses Lace's normal Cardano
 * tx-executor (`confirmTx`/`submitTx`) on the unsigned order CBOR rather than
 * the SDK's Blaze submit. Each entry-point emits its `txPhaseRequested` action
 * (passed through) plus the result; failures route to Error.
 */
export const makeFinalize: SideEffect = (
  { txExecutor },
  {
    realfiFlow: { selectFlowState$ },
    wallets: { selectAll$ },
    addresses: { selectByAccountId$ },
    tokenPricing: { selectPrices$ },
    tokens: { selectTokenById$ },
    network: { selectActiveNetworkId$ },
    features: { selectLoadedFeatures$ },
  },
  { actions, realfiProviders },
) => {
  const confirmTx = makeConfirmTx(txExecutor);
  const submitTx = makeSubmitTx(txExecutor);
  return firstStateOfStatus(selectFlowState$, 'SubmittingTransaction').pipe(
    withLatestFrom(
      selectAll$,
      selectByAccountId$,
      selectPrices$,
      selectTokenById$,
      selectActiveNetworkId$,
      selectLoadedFeatures$,
    ),
    switchMap(
      ([
        state,
        wallets,
        selectByAccountId,
        prices,
        selectTokenById,
        selectActiveNetworkId,
        loadedFeatures,
      ]) => {
        // Resolve the signing wallet FRESH at sign time (like swap-context) —
        // a snapshot carried in flow state from build time can go stale between
        // build and sign; absence fails explicitly, never a substitute wallet.
        const wallet = wallets.find(w =>
          w.accounts.some(a => a.accountId === state.accountId),
        );
        if (!wallet) {
          realfiDebugLog('finalize: wallet for account missing', {
            accountId: state.accountId,
          });
          return of(
            actions.realfiFlow.submissionFailed({ errorMessage: ERROR_KEY }),
          );
        }
        const kind = state.kind;
        const realfiConfig = getRealFiConfigFromFlags(
          loadedFeatures.featureFlags,
          selectActiveNetworkId('Cardano'),
        );
        // The funnel's "submitted" (LW-15494) fires on sign completion below —
        // the one lifecycle stage with no state-machine transition for
        // makeFlowAnalytics to observe.
        const trackSubmitted =
          kind === 'stake' || kind === 'unstake'
            ? actions.analytics.trackEvent({
                eventName: REALFI_FLOW_EVENT_NAME[kind].submitted,
                payload: getFlowAnalyticsContext({
                  flow: {
                    kind,
                    inputAmount: state.inputAmount,
                    inputTokenId: state.inputTokenId,
                    review: state.review,
                  },
                  prices,
                  selectTokenById,
                  usdrTokenId: realfiConfig?.usdrTokenId,
                }),
              })
            : undefined;
        realfiDebugLog('finalize: confirm (sign) requested', {
          accountId: state.accountId,
          cborLength: state.serializedTx.length,
          unsignedTxCbor: state.serializedTx,
        });
        return confirmTx(
          {
            accountId: state.accountId,
            blockchainName: 'Cardano',
            blockchainSpecificSendFlowData: {},
            serializedTx: state.serializedTx,
            wallet,
          },
          result => result,
        ).pipe(
          mergeMap(confirmValue => {
            // Pass through the txPhaseRequested action (first emission).
            if (!('success' in confirmValue)) {
              realfiDebugLog('finalize: confirm phase action pass-through', {
                actionType: (confirmValue as { type?: string }).type,
              });
              return of(confirmValue);
            }
            if (!confirmValue.success) {
              // A confirm-stage failure is overwhelmingly the user dismissing
              // the signing prompt (the result carries no cancellation
              // discriminator). Return to Reviewing — the user's own act, no
              // "Transaction failed" sheet — matching the claim flow's quiet
              // `withdrawDeclined` (R3-3). A genuine sign error also lands here;
              // the user can re-confirm or dismiss. Submit-stage failures (a
              // real broadcast error, below) still route to Error.
              realfiDebugLog('finalize: confirm (sign) declined/failed', {
                error: confirmValue.error,
                errorTranslationKeys: confirmValue.errorTranslationKeys,
              });
              return of(actions.realfiFlow.signingCancelled());
            }
            realfiDebugLog('finalize: confirm (sign) ok → submitTx', {
              signedCborLength: confirmValue.serializedTx.length,
              signedTxCbor: confirmValue.serializedTx,
            });
            // RealFi partner attribution: claim the order output before the tx
            // is broadcast, binding the claim to the now-final body hash.
            // Dispatches nothing — it gates submit by completing, and a claim
            // that never succeeds is logged and waived rather than costing the
            // user a transaction they have already signed (the on-chain origin
            // metadata still carries partner='lace' as the weaker signal).
            const provider = realfiProviders[0];
            const userAddress = selectByAccountId(state.accountId)[0]?.address;
            const claimAttribution$ =
              state.orderOutputIndex === undefined ||
              !provider ||
              !realfiConfig ||
              !userAddress
                ? EMPTY
                : provider
                    .claimOrderAttribution({
                      config: realfiConfig,
                      userAddress,
                      serializedTx: confirmValue.serializedTx,
                      orderOutputIndex: state.orderOutputIndex,
                    })
                    .pipe(
                      retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
                      timeout(ATTRIBUTION_CLAIM_WAIT_MS),
                      tap(result => {
                        realfiDebugLog('finalize: attribution claim settled', {
                          ok: result.isOk(),
                          status: result.isOk()
                            ? result.value.status
                            : undefined,
                          error: result.isOk() ? undefined : result.error,
                        });
                      }),
                      catchError(error => {
                        realfiDebugLog(
                          'finalize: attribution claim FAILED — submitting unattributed',
                          {
                            error: detailOf(error),
                            timedOut: error instanceof TimeoutError,
                          },
                        );
                        return EMPTY;
                      }),
                      ignoreElements(),
                    );
            const submit$ = submitTx(
              {
                accountId: state.accountId,
                blockchainName: 'Cardano',
                blockchainSpecificSendFlowData: {},
                serializedTx: confirmValue.serializedTx,
              },
              result => result,
            ).pipe(
              mergeMap(submitValue => {
                if (!('success' in submitValue)) {
                  realfiDebugLog('finalize: submit phase action pass-through', {
                    actionType: (submitValue as { type?: string }).type,
                  });
                  return of(submitValue);
                }
                if (submitValue.success) {
                  realfiDebugLog('finalize: submit SUCCEEDED', {
                    txId: submitValue.txId,
                  });
                  return from([
                    // The order is in flight from the moment it is broadcast.
                    // Beyond surfacing it in Activity at once, the row's
                    // consumed inputs leave `selectAvailableAccountUtxos`, so
                    // a transaction built before this one confirms cannot be
                    // offered inputs the order already spent (BadInputsUTxO).
                    // `inputAmount` is base units (set from `amountBaseUnits`
                    // by the Manage Stake sheet), so it needs no scaling.
                    actions.activities.upsertActivities({
                      accountId: state.accountId,
                      activities: [
                        {
                          accountId: state.accountId,
                          activityId: submitValue.txId,
                          timestamp: Timestamp(Date.now()),
                          tokenBalanceChanges: [
                            {
                              tokenId: TokenId(state.inputTokenId),
                              amount: BigNumber(-BigInt(state.inputAmount)),
                            },
                          ],
                          type: ActivityType.Pending,
                          ...pendingActivityMetadata(submitValue),
                        },
                      ],
                    }),
                    // Watch the order tx until the RealFi feed returns it — a
                    // confirmed tx the feed still misses past the grace period
                    // drives the USDr detail's feed-mismatch warning. Recorded
                    // before Queued so the watch exists before any post-queue
                    // activities read could race its clearing.
                    actions.realfiPosition.submittedOrderTxRecorded({
                      accountId: state.accountId,
                      orderTx: {
                        txHash: submitValue.txId,
                        recordedAt: Date.now(),
                        kind: state.kind === 'unstake' ? 'unstake' : 'stake',
                        inputTokenId: state.inputTokenId,
                      },
                    }),
                    actions.realfiFlow.queued({
                      txId: submitValue.txId,
                      stakeId: RealFiStakeId(`stake-${state.accountId}`),
                    }),
                  ]);
                }
                realfiDebugLog('finalize: submit FAILED', {
                  error: submitValue.error,
                  errorTranslationKeys: submitValue.errorTranslationKeys,
                });
                return of(
                  actions.realfiFlow.submissionFailed({
                    errorMessage: ERROR_KEY,
                    errorDetail: detailOf(submitValue.error),
                  }),
                );
              }),
            );
            return trackSubmitted === undefined
              ? concat(claimAttribution$, submit$)
              : concat(of(trackSubmitted), claimAttribution$, submit$);
          }),
          // Without this, a throwing confirm/submit kills the finalize stream
          // with no dispatch and no log: the flow wedges in SubmittingTransaction
          // and every later attempt is dead on arrival.
          catchError(error => {
            realfiDebugLog('finalize: pipeline ERROR', { error });
            return of(
              actions.realfiFlow.submissionFailed({
                errorMessage: ERROR_KEY,
                errorDetail: detailOf(error),
              }),
            );
          }),
        );
      },
    ),
  );
};

/**
 * Flow lifecycle analytics (LW-15494): observes realfiFlow transitions and maps
 * them to PostHog events — `tx built` (build succeeded), `success` (queued) and
 * `failure` (a post-confirm build/submit error; quote failures while the user
 * is still typing are not attempts and stay untracked). The pre-transition
 * state supplies the amounts, because `Queued` and `Error` drop the review.
 * A swap-routed stake also reports `get usdr | success` — the launch season's
 * bonus-conversion funnel measures acquisition, and today the swap-to-stake
 * path is the only in-flow way to acquire USDr (`entry_point` distinguishes
 * the dedicated Get USDr flow once LW-15085/LW-15086 land).
 */
export const makeFlowAnalytics: SideEffect = (
  _,
  {
    realfiFlow: { selectFlowState$ },
    tokenPricing: { selectPrices$ },
    tokens: { selectTokenById$ },
    network: { selectActiveNetworkId$ },
    features: { selectLoadedFeatures$ },
  },
  { actions },
) =>
  selectFlowState$.pipe(
    distinctUntilChanged(),
    pairwise(),
    withLatestFrom(
      selectPrices$,
      selectTokenById$,
      selectActiveNetworkId$,
      selectLoadedFeatures$,
    ),
    mergeMap(
      ([
        [previous, next],
        prices,
        selectTokenById,
        selectActiveNetworkId,
        loadedFeatures,
      ]) => {
        // Every tracked transition leaves signing/submitting — the states
        // that still carry the review the payload amounts come from.
        if (
          previous.status !== 'SigningTransaction' &&
          previous.status !== 'SubmittingTransaction'
        ) {
          return EMPTY;
        }
        const kind = previous.kind;
        if (kind !== 'stake' && kind !== 'unstake') return EMPTY;
        const usdrTokenId = getRealFiConfigFromFlags(
          loadedFeatures.featureFlags,
          selectActiveNetworkId('Cardano'),
        )?.usdrTokenId;
        const context = getFlowAnalyticsContext({
          flow: {
            kind,
            inputAmount: previous.inputAmount,
            inputTokenId: previous.inputTokenId,
            review: previous.review,
          },
          prices,
          selectTokenById,
          usdrTokenId,
        });
        if (
          previous.status === 'SigningTransaction' &&
          next.status === 'SubmittingTransaction'
        ) {
          return of(
            actions.analytics.trackEvent({
              eventName: REALFI_FLOW_EVENT_NAME[kind].txBuilt,
              payload: context,
            }),
          );
        }
        if (next.status === 'Queued') {
          const events = [
            actions.analytics.trackEvent({
              eventName: REALFI_FLOW_EVENT_NAME[kind].success,
              payload: { ...context, txId: next.txId },
            }),
          ];
          if (
            kind === 'stake' &&
            usdrTokenId !== undefined &&
            previous.inputTokenId !== usdrTokenId
          ) {
            events.push(
              actions.analytics.trackEvent({
                eventName: 'realfi | get usdr | success',
                payload: {
                  entry_point: 'swap_to_stake',
                  source_token: context.source_token,
                  ...(context.usdr_amount !== undefined && {
                    usdr_amount: context.usdr_amount,
                  }),
                  ...(context.usd_value !== undefined && {
                    usd_value: context.usd_value,
                  }),
                  txId: next.txId,
                },
              }),
            );
          }
          return from(events);
        }
        if (next.status === 'Error') {
          return of(
            actions.analytics.trackEvent({
              eventName: REALFI_FLOW_EVENT_NAME[kind].failure,
              payload: {
                ...context,
                stage:
                  next.previousStatus === 'SigningTransaction'
                    ? 'build'
                    : 'submit',
                ...(next.errorCode !== undefined && {
                  error_code: next.errorCode,
                }),
              },
            }),
          );
        }
        return EMPTY;
      },
    ),
  );

/**
 * Diagnostic trace (LW-14681): every realfiFlow state transition in one place,
 * so a shared console capture shows the exact state timeline around a failure.
 * Emits no actions.
 */
export const makeFlowTrace: SideEffect = (
  _,
  { realfiFlow: { selectFlowState$ } },
) =>
  selectFlowState$.pipe(
    tap(state => {
      realfiDebugLog('flow state', {
        status: state.status,
        ...('kind' in state && { kind: state.kind }),
        ...('accountId' in state && { accountId: state.accountId }),
        ...('inputAmount' in state && { inputAmount: state.inputAmount }),
        ...('inputTokenId' in state && { inputTokenId: state.inputTokenId }),
        ...('outputTokenId' in state && {
          outputTokenId: state.outputTokenId,
        }),
        hasReview: 'review' in state,
        ...('unsignedTxCbor' in state && {
          unsignedTxCborLength: state.unsignedTxCbor.length,
        }),
        ...('serializedTx' in state && {
          serializedTxLength: state.serializedTx.length,
        }),
        ...('txId' in state && { txId: state.txId }),
        ...('stakeId' in state && { stakeId: state.stakeId }),
        ...('errorMessage' in state && { errorMessage: state.errorMessage }),
        ...('previousStatus' in state && {
          previousStatus: state.previousStatus,
        }),
      });
    }),
    ignoreElements(),
  );

/**
 * Cancel arm: `cancelRequested` → provider.buildCancelTx (swap or stake leg) →
 * tx-executor confirm (sign) → submit. Triggered directly from the Stake Detail
 * sheet (not the flow machine), so the user can cancel a pending order wherever
 * they are in the flow. Emits the tx-executor phase actions. Build/submit
 * failures toast; a declined signing prompt stays silent (the user's own act).
 * Success toasts and re-requests activities so the canceled order clears.
 */
export const makeCancel: SideEffect = (
  { realfiPosition: { cancelRequested$ }, txExecutor },
  {
    wallets: { selectAll$ },
    addresses: { selectByAccountId$ },
    network: { selectActiveNetworkId$ },
    features: { selectLoadedFeatures$ },
  },
  { actions, realfiProviders },
) => {
  const confirmTx = makeConfirmTx(txExecutor);
  const submitTx = makeSubmitTx(txExecutor);
  const cancelFailure = () =>
    of(
      actions.ui.showToast({
        text: 'realfi.toast.cancel-failed.title',
        subtitle: 'realfi.toast.cancel-failed.subtitle',
        color: 'negative',
        leftIcon: { name: 'Cancel', size: 20 },
      }),
    );
  return cancelRequested$.pipe(
    withLatestFrom(
      selectAll$,
      selectByAccountId$,
      selectActiveNetworkId$,
      selectLoadedFeatures$,
    ),
    // exhaustMap, not switchMap: a second cancelRequested must not unsubscribe
    // an in-flight cancel between sign and submit (the signed tx would never
    // broadcast, with no failure surfaced) — it is ignored until this settles.
    exhaustMap(
      ([
        { payload },
        wallets,
        selectByAccountId,
        selectActiveNetworkId,
        loadedFeatures,
      ]) => {
        const provider = realfiProviders[0];
        const config = getRealFiConfigFromFlags(
          loadedFeatures.featureFlags,
          selectActiveNetworkId('Cardano'),
        );
        // Strictly the wallet owning the account — no fallback (see makeBuild).
        const wallet = wallets.find(w =>
          w.accounts.some(a => a.accountId === payload.accountId),
        );
        const userAddress = selectByAccountId(payload.accountId)[0]?.address;
        if (!provider || !config || !wallet || !userAddress) return EMPTY;
        const submitCancel$ = (serializedTx: string) =>
          submitTx(
            {
              accountId: payload.accountId,
              blockchainName: 'Cardano',
              blockchainSpecificSendFlowData: {},
              serializedTx,
            },
            passResult,
          ).pipe(
            mergeMap(submitValue => {
              if (!('success' in submitValue)) return of(submitValue);
              if (!submitValue.success) {
                realfiDebugLog('cancel: submit FAILED', {
                  error: submitValue.error,
                });
                return cancelFailure();
              }
              return from([
                actions.ui.showToast({
                  text: 'realfi.cancel.canceled',
                  color: 'positive',
                  leftIcon: { name: 'Checkmark', size: 20 },
                }),
                actions.realfiPosition.stakeActivitiesRequested({
                  accountId: payload.accountId,
                }),
              ]);
            }),
          );
        return provider
          .buildCancelTx({
            config,
            accountId: payload.accountId,
            userAddress,
            orderId: payload.orderId,
            stage: payload.stage,
          })
          .pipe(
            retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
            switchMap(result => {
              if (!result.isOk()) {
                realfiDebugLog('cancel: build FAILED', { error: result.error });
                return cancelFailure();
              }
              return confirmTx(
                {
                  accountId: payload.accountId,
                  blockchainName: 'Cardano',
                  blockchainSpecificSendFlowData: {},
                  serializedTx: result.value.unsignedTxCbor,
                  wallet,
                },
                passResult,
              ).pipe(
                mergeMap(confirmValue => {
                  if (!('success' in confirmValue)) return of(confirmValue);
                  // Declined signing prompt — the user's own act, no toast.
                  if (!confirmValue.success) return EMPTY;
                  return submitCancel$(confirmValue.serializedTx);
                }),
              );
            }),
            catchError(error => {
              realfiDebugLog('cancel: pipeline ERROR', { error });
              return cancelFailure();
            }),
          );
      },
    ),
  );
};

/**
 * Read arm: `stakeActivitiesRequested` (dispatched by the USDr staking detail on
 * mount / account / network change) → provider off-chain reads → store. The
 * reads run in the provider (service worker), where the RealFi SDK's off-chain
 * client + its `@blaze-cardano/core` dependency load — they cannot run in the
 * Metro-bundled UI (ADR-19: SDK/network calls behind the provider dependency,
 * never in the component). On error the previous data is kept (no `Received`
 * dispatch), so a transient failure never wipes the list.
 */
export const makeStakeActivities: SideEffect = (
  { realfiPosition: { stakeActivitiesRequested$ } },
  {
    addresses: { selectByAccountId$ },
    network: { selectActiveNetworkId$ },
    features: { selectLoadedFeatures$ },
  },
  { actions, realfiProviders },
) =>
  stakeActivitiesRequested$.pipe(
    withLatestFrom(
      selectByAccountId$,
      selectActiveNetworkId$,
      selectLoadedFeatures$,
    ),
    mergeMap(
      ([
        { payload },
        selectByAccountId,
        selectActiveNetworkId,
        loadedFeatures,
      ]) => {
        const provider = realfiProviders[0];
        const config = getRealFiConfigFromFlags(
          loadedFeatures.featureFlags,
          selectActiveNetworkId('Cardano'),
        );
        const userAddress = selectByAccountId(payload.accountId)[0]?.address;
        if (!provider || !config || !userAddress) return EMPTY;
        return provider
          .getStakeActivities({
            config,
            accountId: payload.accountId,
            userAddress,
          })
          .pipe(
            retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
            mergeMap(result =>
              result.isOk()
                ? of(
                    actions.realfiPosition.stakeActivitiesReceived({
                      accountId: payload.accountId,
                      activities: result.value,
                    }),
                  )
                : EMPTY,
            ),
            catchError(() => EMPTY),
          );
      },
    ),
  );

/**
 * R-Points read (launch season, LW-15495): `rPointsRequested` (the USDr detail
 * screen on every focus, and each queued stake/unstake via
 * `makeRPointsQueuedRefresh`) → the provider's partner-SDK points read →
 * persisted per-account store. Gated on the `launchSeason` window — dropping
 * the season entry from the flag payload, or letting its window lapse,
 * silences the read and hides every R-Points surface. Every request refetches;
 * errors keep the previous snapshot (no
 * `Received` dispatch), so the read can never blank or block the screen.
 */
export const makeRPoints: SideEffect = (
  { realfiPosition: { rPointsRequested$ } },
  {
    addresses: { selectByAccountId$ },
    network: { selectActiveNetworkId$ },
    features: { selectLoadedFeatures$ },
  },
  { actions, realfiProviders },
) =>
  rPointsRequested$.pipe(
    withLatestFrom(
      selectByAccountId$,
      selectActiveNetworkId$,
      selectLoadedFeatures$,
    ),
    mergeMap(
      ([
        { payload },
        selectByAccountId,
        selectActiveNetworkId,
        loadedFeatures,
      ]) => {
        const provider = realfiProviders[0];
        const config = getRealFiConfigFromFlags(
          loadedFeatures.featureFlags,
          selectActiveNetworkId('Cardano'),
        );
        const userAddress = selectByAccountId(payload.accountId)[0]?.address;
        if (
          !provider ||
          !config ||
          !isLaunchSeasonActive(config.launchSeason, Date.now()) ||
          !userAddress
        ) {
          return EMPTY;
        }
        return provider
          .getRPoints({
            config,
            accountId: payload.accountId,
            userAddress,
          })
          .pipe(
            retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
            mergeMap(result => {
              if (!result.isOk()) {
                realfiDebugLog('r-points: FAILED', { error: result.error });
                return of(
                  actions.realfiPosition.rPointsFetchFailed({
                    accountId: payload.accountId,
                  }),
                );
              }
              return of(
                actions.realfiPosition.rPointsReceived({
                  accountId: payload.accountId,
                  rPoints: result.value,
                }),
              );
            }),
            catchError(error => {
              realfiDebugLog('r-points: pipeline ERROR', { error });
              return of(
                actions.realfiPosition.rPointsFetchFailed({
                  accountId: payload.accountId,
                }),
              );
            }),
          );
      },
    ),
  );

/**
 * Season refresh on transaction confirmation (LW-15495): a queued stake or
 * unstake changes the wallet's action points, so re-read the balance the
 * moment the flow reaches Queued instead of waiting for the next screen
 * visit. Distinct per txId, not stakeId: the flow state re-emits on unrelated
 * store updates while the confirmation sheet stays open, and txId is the only
 * field that changes per confirmation — a stake's `stakeId` is the synthetic
 * `stake-${accountId}`, so deduping on it swallowed every stake after an
 * account's first. `makeRPoints` still gates on the launchSeason window, so
 * this stays silent when the season is off.
 */
export const makeRPointsQueuedRefresh: SideEffect = (
  _,
  { realfiFlow: { selectFlowState$ } },
  { actions },
) =>
  selectFlowState$.pipe(
    filter(
      (state): state is Extract<RealFiFlowState, { status: 'Queued' }> =>
        state.status === 'Queued',
    ),
    distinctUntilChanged((a, b) => a.txId === b.txId),
    map(state =>
      actions.realfiPosition.rPointsRequested({ accountId: state.accountId }),
    ),
  );

/**
 * Wallet-wide withdraw-ready read: `withdrawablesRequested` → for every
 * active-network Cardano account, fetch its matured (unspent) timelocks via the
 * provider and store them per account. The banner/modal aggregate across
 * accounts, so a wallet with claimables on more than one account sees them all.
 */
export const makeWithdrawables: SideEffect = (
  { realfiPosition: { withdrawablesRequested$ } },
  {
    wallets: { selectActiveNetworkAccountsByBlockchainName$ },
    addresses: { selectByAccountId$ },
    network: { selectActiveNetworkId$ },
    features: { selectLoadedFeatures$ },
  },
  { actions, realfiProviders },
) =>
  withdrawablesRequested$.pipe(
    withLatestFrom(
      selectActiveNetworkAccountsByBlockchainName$,
      selectByAccountId$,
      selectActiveNetworkId$,
      selectLoadedFeatures$,
    ),
    mergeMap(
      ([
        ,
        selectAccounts,
        selectByAccountId,
        selectActiveNetworkId,
        loadedFeatures,
      ]) => {
        const provider = realfiProviders[0];
        const config = getRealFiConfigFromFlags(
          loadedFeatures.featureFlags,
          selectActiveNetworkId('Cardano'),
        );
        const accounts = selectAccounts({ blockchainName: 'Cardano' }) ?? [];
        realfiDebugLog('withdrawables: requested', {
          accounts: accounts.length,
          hasProvider: !!provider,
          hasConfig: !!config,
        });
        if (!provider || !config || accounts.length === 0) return EMPTY;
        return merge(
          ...accounts.flatMap(account => {
            const userAddress = selectByAccountId(account.accountId)[0]
              ?.address;
            if (!userAddress) return [EMPTY];
            const request = {
              config,
              accountId: account.accountId,
              userAddress,
            };
            const withdrawable$ = provider
              .getWithdrawableUnstakes(request)
              .pipe(
                retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
                mergeMap(result => {
                  if (!result.isOk()) return EMPTY;
                  realfiDebugLog('withdrawables: account result', {
                    account: account.accountId,
                    withdrawable: result.value.length,
                  });
                  return of(
                    actions.realfiPosition.withdrawableReceived({
                      accountId: account.accountId,
                      unstakes: result.value,
                    }),
                  );
                }),
                catchError(() => EMPTY),
              );
            const coolingDown$ = provider.getCoolingDownUnstakes(request).pipe(
              retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
              mergeMap(result => {
                if (!result.isOk()) return EMPTY;
                realfiDebugLog('withdrawables: account cooling down', {
                  account: account.accountId,
                  coolingDown: result.value.length,
                });
                return of(
                  actions.realfiPosition.coolingDownReceived({
                    accountId: account.accountId,
                    unstakes: result.value,
                  }),
                );
              }),
              catchError(() => EMPTY),
            );
            return [withdrawable$, coolingDown$];
          }),
        );
      },
    ),
  );

/**
 * Withdraw arm: `withdrawRequested` (from the Ready-to-withdraw modal) →
 * provider.buildWithdrawTx (one `@cardano-sdk` tx spending every matured
 * timelock, batched by unlock slot) → tx-executor confirm (sign once) → submit.
 * On success, re-request activities so the banner/list refresh. Build/submit
 * failures record a `withdrawFailure` for the error sheet (a flow error, not a
 * transient read — LW-14684); a declined signing prompt stays silent (the
 * user's own act).
 */
export const makeWithdraw: SideEffect = (
  { realfiPosition: { withdrawRequested$ }, txExecutor },
  {
    realfiPosition: { selectWithdrawFeeQuote$ },
    wallets: { selectAll$ },
    addresses: { selectByAccountId$ },
    network: { selectActiveNetworkId$ },
    features: { selectLoadedFeatures$ },
  },
  { actions, realfiProviders },
) => {
  const confirmTx = makeConfirmTx(txExecutor);
  const submitTx = makeSubmitTx(txExecutor);
  const withdrawFailure = (payload: {
    accountId: AccountId;
    unstakes: RealFiWithdrawableUnstake[];
  }) =>
    from([
      actions.realfiPosition.withdrawFailed(payload),
      actions.analytics.trackEvent({
        eventName: 'realfi | claim | failure',
        payload: claimAnalyticsPayload(payload.unstakes),
      }),
    ]);
  return withdrawRequested$.pipe(
    withLatestFrom(
      selectAll$,
      selectByAccountId$,
      selectActiveNetworkId$,
      selectLoadedFeatures$,
      selectWithdrawFeeQuote$,
    ),
    // exhaustMap, not switchMap: a claim in flight must be neither superseded
    // (unsubscribing between sign and submit would drop the broadcast) nor
    // duplicated — a re-entrant request would spend the same timelock UTxOs
    // ("inputs already spent"). New requests are ignored until this settles.
    exhaustMap(
      ([
        { payload },
        wallets,
        selectByAccountId,
        selectActiveNetworkId,
        loadedFeatures,
        withdrawFeeQuote,
      ]) => {
        const provider = realfiProviders[0];
        const config = getRealFiConfigFromFlags(
          loadedFeatures.featureFlags,
          selectActiveNetworkId('Cardano'),
        );
        // Strictly the wallet owning the account — no fallback (see makeBuild).
        const wallet = wallets.find(w =>
          w.accounts.some(a => a.accountId === payload.accountId),
        );
        const userAddress = selectByAccountId(payload.accountId)[0]?.address;
        realfiDebugLog('withdraw: side-effect fired', {
          account: payload.accountId,
          unstakes: payload.unstakes.length,
          hasProvider: !!provider,
          hasConfig: !!config,
          hasWallet: !!wallet,
          hasAddress: !!userAddress,
        });
        if (
          !provider ||
          !config ||
          !wallet ||
          !userAddress ||
          payload.unstakes.length === 0
        ) {
          // Unlock the claim CTA — withdrawRequested set withdrawInFlight.
          return of(actions.realfiPosition.withdrawDeclined());
        }
        // On success: (1) optimistically remove the claimed timelocks so the
        // withdraw banner/modal clear at once, (2) record a "Withdraw" history
        // row (the off-chain read can't re-derive a completed claim — the
        // order drops out of the Executed feed once its timelock is spent),
        // and (3) refresh the read so stake/unstake rows stay current.
        const withdrawSucceededActions = (txId: string) => {
          const amountUsdr = sumUsdrBaseUnits(payload.unstakes);
          return [
            // First: the still-open claim sheet flips to its
            // "Claim completed" success state (LW-14684).
            actions.realfiPosition.withdrawSucceeded({
              accountId: payload.accountId,
              amountUsdr,
            }),
            actions.realfiPosition.withdrawableCleared({
              accountId: payload.accountId,
              timelockUtxos: payload.unstakes.map(
                unstake => unstake.timelockUtxo,
              ),
            }),
            actions.realfiPosition.withdrawActivitiesRecorded({
              accountId: payload.accountId,
              activities: toWithdrawActivities(payload.unstakes, Date.now()),
            }),
            actions.realfiPosition.stakeActivitiesRequested({
              accountId: payload.accountId,
            }),
            // Immediate recheck (QA: banner stuck after claiming): with
            // several claims pending the banner stays and its total
            // refreshes; the just-claimed timelock cannot return —
            // `withdrawableReceived` suppresses it until the claim tx
            // confirms.
            actions.realfiPosition.withdrawablesRequested(),
            actions.analytics.trackEvent({
              eventName: 'realfi | claim | success',
              payload: { ...claimAnalyticsPayload(payload.unstakes), txId },
            }),
          ];
        };
        const submitWithdraw$ = (serializedTx: string) =>
          submitTx(
            {
              accountId: payload.accountId,
              blockchainName: 'Cardano',
              blockchainSpecificSendFlowData: {},
              serializedTx,
            },
            passResult,
          ).pipe(
            mergeMap(submitValue => {
              if (!('success' in submitValue)) return of(submitValue);
              if (!submitValue.success) return withdrawFailure(payload);
              return from(withdrawSucceededActions(submitValue.txId));
            }),
          );
        // Sign the sheet's dry-run-quoted tx when it covers exactly this
        // timelock set and is fresh: the fee the user approved IS the fee the
        // signed tx pays, and confirm skips re-reading every timelock UTxO.
        // Anything else (stale, different set, no quote) rebuilds.
        const reusableQuote =
          withdrawFeeQuote?.timelockKey === timelockKeyOf(payload.unstakes) &&
          Date.now() - withdrawFeeQuote.quotedAt < WITHDRAW_QUOTE_REUSE_MS
            ? withdrawFeeQuote
            : undefined;
        const build$ = reusableQuote
          ? of(
              Ok<RealFiBundledTransaction>({
                unsignedTxCbor: reusableQuote.unsignedTxCbor,
                feeLovelace: reusableQuote.feeLovelace,
              }),
            )
          : provider
              .buildWithdrawTx({
                config,
                accountId: payload.accountId,
                userAddress,
                unstakes: payload.unstakes,
              })
              .pipe(retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG));
        return build$.pipe(
          switchMap(result => {
            if (!result.isOk()) {
              realfiDebugLog('withdraw: build FAILED', { result });
              return withdrawFailure(payload);
            }
            realfiDebugLog('withdraw: build ok → confirmTx', {
              cborLength: result.value.unsignedTxCbor.length,
            });
            return confirmTx(
              {
                accountId: payload.accountId,
                blockchainName: 'Cardano',
                blockchainSpecificSendFlowData: {},
                serializedTx: result.value.unsignedTxCbor,
                wallet,
              },
              passResult,
            ).pipe(
              mergeMap(confirmValue => {
                realfiDebugLog('withdraw: confirm phase', { confirmValue });
                if (!('success' in confirmValue)) return of(confirmValue);
                // Declined signing prompt — the user's own act, no toast;
                // withdrawDeclined re-enables the claim CTA.
                if (!confirmValue.success) {
                  return of(actions.realfiPosition.withdrawDeclined());
                }
                return submitWithdraw$(confirmValue.serializedTx);
              }),
            );
          }),
          catchError(error => {
            realfiDebugLog('withdraw: pipeline ERROR', { error });
            return withdrawFailure(payload);
          }),
        );
      },
    ),
  );
};

/**
 * Claim fee quote: `withdrawFeeQuoteRequested` (the claim sheet on open) →
 * dry-run `buildWithdrawTx` → the built tx's exact ledger fee, so the sheet's
 * fee rows show the real cost instead of the flat upper bound (LW-14684). A
 * failed dry run stays silent — the sheet keeps its conservative estimate.
 */
export const makeWithdrawFeeQuote: SideEffect = (
  { realfiPosition: { withdrawFeeQuoteRequested$ } },
  {
    addresses: { selectByAccountId$ },
    network: { selectActiveNetworkId$ },
    features: { selectLoadedFeatures$ },
  },
  { actions, realfiProviders },
) =>
  withdrawFeeQuoteRequested$.pipe(
    withLatestFrom(
      selectByAccountId$,
      selectActiveNetworkId$,
      selectLoadedFeatures$,
    ),
    // switchMap: a newer quote request supersedes an in-flight dry run.
    switchMap(
      ([{ payload }, selectByAccountId, selectActiveNetworkId, loaded]) => {
        const provider = realfiProviders[0];
        const config = getRealFiConfigFromFlags(
          loaded.featureFlags,
          selectActiveNetworkId('Cardano'),
        );
        const userAddress = selectByAccountId(payload.accountId)[0]?.address;
        if (
          !provider ||
          !config ||
          !userAddress ||
          payload.unstakes.length === 0
        ) {
          return EMPTY;
        }
        return provider
          .buildWithdrawTx({
            config,
            accountId: payload.accountId,
            userAddress,
            unstakes: payload.unstakes,
          })
          .pipe(
            mergeMap(result =>
              result.isOk() && result.value.feeLovelace !== undefined
                ? of(
                    actions.realfiPosition.withdrawFeeQuoteReceived({
                      feeLovelace: result.value.feeLovelace,
                      // The built CBOR itself: confirm signs THIS tx (fee
                      // shown === fee paid) instead of rebuilding from
                      // scratch, as long as the timelock set matches and the
                      // quote is fresh.
                      unsignedTxCbor: result.value.unsignedTxCbor,
                      timelockKey: timelockKeyOf(payload.unstakes),
                      quotedAt: Date.now(),
                    }),
                  )
                : EMPTY,
            ),
            catchError(() => EMPTY),
          );
      },
    ),
  );

/**
 * A persisted yield read younger than this serves as-is — the vault
 * rate/APY move on daily settlement buckets, so refetching on every boot or
 * screen visit (the flags/network prime re-fires on each app start) only
 * multiplies backend load for the same figures.
 */
const YIELD_REFRESH_TTL_MS = 5 * 60_000;

/**
 * Yield-info read: `yieldInfoRequested` (the USDr detail screen on mount and
 * the module's boot prime) → provider off-chain read → persisted per-network
 * store. A persisted value fresher than YIELD_REFRESH_TTL_MS short-circuits
 * the fetch (`fetchedAt` is persisted for exactly this); the reducer ignores
 * an unchanged rate, so a revisit renders the persisted value with no flicker;
 * errors keep the previous value (no `Received` dispatch), matching the
 * activities read.
 */
export const makeYieldInfo: SideEffect = (
  { realfiPosition: { yieldInfoRequested$ } },
  {
    realfiPosition: { selectYieldInfoByNetwork$ },
    network: { selectActiveNetworkId$ },
    features: { selectLoadedFeatures$ },
  },
  { actions, realfiProviders },
) =>
  yieldInfoRequested$.pipe(
    withLatestFrom(
      selectYieldInfoByNetwork$,
      selectActiveNetworkId$,
      selectLoadedFeatures$,
    ),
    switchMap(
      ([, yieldInfoByNetwork, selectActiveNetworkId, loadedFeatures]) => {
        const provider = realfiProviders[0];
        const networkId = selectActiveNetworkId('Cardano');
        const config = getRealFiConfigFromFlags(
          loadedFeatures.featureFlags,
          networkId,
        );
        if (!provider || !config || !networkId) return EMPTY;
        const persisted = yieldInfoByNetwork[config.realfiNetwork];
        if (
          persisted &&
          Date.now() - persisted.fetchedAt < YIELD_REFRESH_TTL_MS
        ) {
          return EMPTY;
        }
        return provider.getExchangeRateAndApy({ config }).pipe(
          retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
          mergeMap(result => {
            if (!result.isOk()) {
              realfiDebugLog('yield-info: FAILED', { error: result.error });
              return EMPTY;
            }
            return of(
              actions.realfiPosition.yieldInfoReceived({
                realfiNetwork: config.realfiNetwork,
                yieldInfo: result.value,
              }),
            );
          }),
          catchError(error => {
            realfiDebugLog('yield-info: pipeline ERROR', { error });
            return EMPTY;
          }),
        );
      },
    ),
  );

/**
 * Stake-input list: `stakeInputAssetsRequested` (the Manage sheet on open /
 * config change) → provider partner-config read + Sundae pool discovery →
 * store. Runs in the provider (ADR-19) — the Sundae client cannot load in the
 * Metro-bundled UI. Errors keep the previous list (no `Received` dispatch);
 * the sheet falls back to the compiled counterpart copy until data arrives.
 */
export const makeStakeInputAssets: SideEffect = (
  { realfiPosition: { stakeInputAssetsRequested$ } },
  { network: { selectActiveNetworkId$ }, features: { selectLoadedFeatures$ } },
  { actions, realfiProviders },
) =>
  stakeInputAssetsRequested$.pipe(
    withLatestFrom(selectActiveNetworkId$, selectLoadedFeatures$),
    switchMap(([, selectActiveNetworkId, loadedFeatures]) => {
      const provider = realfiProviders[0];
      const config = getRealFiConfigFromFlags(
        loadedFeatures.featureFlags,
        selectActiveNetworkId('Cardano'),
      );
      if (!provider || !config) return EMPTY;
      return provider.getStakeInputAssets({ config }).pipe(
        retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
        mergeMap(result => {
          if (!result.isOk()) {
            realfiDebugLog('stake-input-assets: FAILED', {
              error: result.error,
            });
            return EMPTY;
          }
          return of(
            actions.realfiPosition.stakeInputAssetsReceived({
              realfiNetwork: config.realfiNetwork,
              assets: result.value,
            }),
          );
        }),
        catchError(error => {
          realfiDebugLog('stake-input-assets: pipeline ERROR', { error });
          return EMPTY;
        }),
      );
    }),
  );

/**
 * Cooldown unlock time: `cooldownUnlockTimeRequested` (the Manage sheet on
 * open / config change) → provider SDK `stakeTimes` read → store. The unlock
 * is the NEXT cooldown-period end (a batch-window boundary, not "now + 7
 * days"). Errors keep the previous value (no `Received` dispatch); the sheet
 * falls back to the static nominal copy until data arrives.
 */
export const makeCooldownUnlockTime: SideEffect = (
  { realfiPosition: { cooldownUnlockTimeRequested$ } },
  { network: { selectActiveNetworkId$ }, features: { selectLoadedFeatures$ } },
  { actions, realfiProviders },
) =>
  cooldownUnlockTimeRequested$.pipe(
    withLatestFrom(selectActiveNetworkId$, selectLoadedFeatures$),
    switchMap(([, selectActiveNetworkId, loadedFeatures]) => {
      const provider = realfiProviders[0];
      const config = getRealFiConfigFromFlags(
        loadedFeatures.featureFlags,
        selectActiveNetworkId('Cardano'),
      );
      if (!provider || !config) return EMPTY;
      return provider.getCooldownUnlockTime({ config }).pipe(
        retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
        mergeMap(result => {
          if (!result.isOk()) {
            realfiDebugLog('cooldown-unlock: FAILED', { error: result.error });
            return EMPTY;
          }
          return of(
            actions.realfiPosition.cooldownUnlockTimeReceived({
              realfiNetwork: config.realfiNetwork,
              unlockAtMs: result.value,
            }),
          );
        }),
        catchError(error => {
          realfiDebugLog('cooldown-unlock: pipeline ERROR', { error });
          return EMPTY;
        }),
      );
    }),
  );

/**
 * Evict the transient per-account reads when the active Cardano network
 * changes: accounts are network-specific (ADR-11), so entries fetched on the
 * previous network would pollute the wallet-wide aggregates (withdraw banner,
 * pending-unstake total, history list) until overwritten. The network-change
 * primes (`makePendingUnstakeRefresh`, the detail screen's requests) refetch
 * for the new network's accounts immediately after.
 */
export const makeNetworkScopeReset: SideEffect = (
  _,
  { network: { selectActiveNetworkId$ } },
  { actions },
) =>
  selectActiveNetworkId$.pipe(
    map(selectActiveNetworkId => selectActiveNetworkId('Cardano')),
    distinctUntilChanged(),
    // The first emission is the boot network — nothing stale to clear yet.
    skip(1),
    map(() => actions.realfiPosition.transientAccountStateCleared()),
  );

export const realfiStakingSideEffects: SideEffect[] = [
  makeFlowTrace,
  makeFlowAnalytics,
  makeQuote,
  makeBuild,
  makeFinalize,
  makeCancel,
  makeStakeActivities,
  makeRPoints,
  makeRPointsQueuedRefresh,
  makeYieldInfo,
  makeStakeInputAssets,
  makeCooldownUnlockTime,
  makeNetworkScopeReset,
  makeWithdrawables,
  makeWithdraw,
  makeWithdrawFeeQuote,
];
