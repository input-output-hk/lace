import { Serialization } from '@cardano-sdk/core';
import { blockingWithLatestFrom } from '@cardano-sdk/util-rxjs';
import { ActivityType } from '@lace-contract/activities';
import { utxoKey } from '@lace-contract/cardano-context';
import { TokenId } from '@lace-contract/tokens';
import { pendingActivityMetadata } from '@lace-contract/tx-executor';
import { whileActive } from '@lace-contract/wallet-active-state';
import { BigNumber, Timestamp } from '@lace-lib/util';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { firstStateOfStatus, serializeError } from '@lace-lib/util-store';
import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  forkJoin,
  from,
  interval,
  map,
  mergeMap,
  of,
  switchMap,
  takeUntil,
  timeout,
  withLatestFrom,
} from 'rxjs';

import { inspectSwapTransaction } from '../check-swap-intent';
import { getQuoteAnalyticsContext } from '../get-quote-analytics-context';
import { getSwapValueAnalytics } from '../get-swap-value-bucket';

import type {
  SwapDexEntry,
  SwapProviderToken,
  SwapStateIdle,
  SwapStateQuoting,
} from './types';
import type { SwapTxInspection } from '../check-swap-intent';
import type { SideEffect } from '../contract';
import type { Cardano } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccountUtxoMap,
  CardanoPaymentAddress,
} from '@lace-contract/cardano-context';
import type {
  SwapProvider,
  SwapQuote,
  SwapQuoteRequest,
} from '@lace-contract/swap-provider';
import type { ConfirmTx, SubmitTx } from '@lace-contract/tx-executor';
import type { AnyWallet, AccountId } from '@lace-contract/wallet-repo';
import type { HexBytes } from '@lace-lib/util';

const QUOTE_REFRESH_INTERVAL_MS = 15_000;
const QUOTE_TIMEOUT_MS = 30_000;
const SWAP_TX_TTL_SECONDS = 900;

/**
 * Decode a built swap transaction and check it against the frozen quote.
 *
 * Resolves inputs against the union of every set this account is recorded as
 * owning — settled, in-flight adjusted, collateral — never the signable subset
 * offered to the aggregator: an own UTxO missing from the resolution set is
 * indistinguishable from a foreign input, so its outflow goes uncounted. The
 * union matters in each direction: the in-flight set drops a UTxO our own
 * pending tx spent (still on-chain, so an external builder can spend it), the
 * settled set lacks the pending change a chained swap is built on, and the
 * collateral set is reconciled against the settled one only asynchronously.
 */
const inspectBuiltSwapTx = ({
  serializedTx,
  accountId,
  selectByAccountId,
  accountUnspendableUtxos,
  accountUtxos,
  accountUtxosWithInFlight,
  quote,
  slippagePercent,
}: {
  serializedTx: HexBytes;
  accountId: AccountId;
  selectByAccountId: (accountId: AccountId) => AnyAddress[];
  accountUnspendableUtxos: AccountUtxoMap;
  accountUtxos: AccountUtxoMap;
  accountUtxosWithInFlight: AccountUtxoMap;
  quote: SwapQuote;
  slippagePercent: number;
}): SwapTxInspection => {
  const byOutpoint = new Map<string, Cardano.Utxo>();
  for (const utxo of [
    ...(accountUtxos[accountId] ?? []),
    ...(accountUtxosWithInFlight[accountId] ?? []),
    ...(accountUnspendableUtxos[accountId] ?? []),
  ])
    byOutpoint.set(utxoKey(utxo), utxo);

  return inspectSwapTransaction({
    // `AnyAddress` is blockchain-agnostic; this effect is Cardano-only.
    accountAddresses: selectByAccountId(accountId).map(
      entry => entry.address as CardanoPaymentAddress,
    ),
    accountUtxos: [...byOutpoint.values()],
    intent: quote,
    serializedTx,
    slippagePercent,
  });
};

const findWalletOwningAccount = (
  wallets: readonly AnyWallet[],
  accountId: AccountId,
): AnyWallet | undefined =>
  wallets.find(wallet =>
    wallet.accounts.some(account => account.accountId === accountId),
  );

// Callers guard against an empty list before calling.
const selectBestQuote = ([
  firstQuote,
  ...otherQuotes
]: SwapQuote[]): SwapQuote =>
  otherQuotes.reduce(
    (best, current) =>
      BigInt(current.expectedBuyAmount) > BigInt(best.expectedBuyAmount)
        ? current
        : best,
    firstQuote,
  );

const fetchQuotesFromAllProviders = (
  providers: SwapProvider[],
  request: SwapQuoteRequest,
) =>
  forkJoin(
    providers.map(provider =>
      provider.getQuote(request).pipe(
        retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
        timeout(QUOTE_TIMEOUT_MS),
        catchError(() => of(undefined)),
      ),
    ),
  );

export const makeFetchQuote: SideEffect = (
  _,
  {
    swapFlow: { selectSwapFlowState$ },
    swapConfig: { selectSlippage$, selectExcludedDexes$ },
    swapAnalytics: { selectSwapSessionId$ },
    tokens: { selectTokenById$ },
  },
  { actions, logger, swapProviders },
) =>
  firstStateOfStatus(selectSwapFlowState$, 'Quoting').pipe(
    withLatestFrom(
      selectSlippage$,
      selectExcludedDexes$,
      selectTokenById$,
      selectSwapSessionId$,
    ),
    switchMap(
      ([state, slippage, excludedDexes, selectTokenById, swapSessionId]: [
        SwapStateQuoting,
        number,
        string[],
        (tokenId: string) => { decimals: number } | undefined,
        string | undefined,
      ]) => {
        const sellToken = selectTokenById(state.sellTokenId);
        const request: SwapQuoteRequest = {
          networkId: 'cardano',
          sellTokenId: state.sellTokenId,
          sellTokenDecimals: sellToken?.decimals ?? 0,
          buyTokenId: state.buyTokenId,
          sellAmount: state.sellAmount,
          slippage,
          excludedDexes,
          userAddress: '',
        };

        return fetchQuotesFromAllProviders(swapProviders, request).pipe(
          switchMap(results => {
            const quotes: SwapQuote[] = [];
            for (const r of results) {
              if (r === undefined) {
                logger.error('[SWAP] provider quote timed out or threw');
              } else if (r.isOk()) {
                quotes.push(r.value);
              } else {
                logger.error('[SWAP] provider returned no quote', r.error);
              }
            }

            if (quotes.length === 0) {
              logger.error('All providers failed to return quotes');
              return from([
                actions.swapFlow.quoteFailed({
                  errorMessage: 'v2.swap.error.no-quotes-available',
                }),
                actions.ui.showToast({
                  text: 'v2.swap.toast.no-quotes.title',
                  subtitle: 'v2.swap.toast.no-quotes.subtitle',
                  color: 'negative',
                  leftIcon: { name: 'Cancel', size: 20 },
                }),
              ]);
            }

            const selectedQuote = selectBestQuote(quotes);
            return from([
              actions.swapFlow.quotesReceived({ quotes, selectedQuote }),
              actions.analytics.trackEvent({
                eventName: 'swaps | fetch estimate',
                payload: {
                  tokenIn: state.sellTokenId,
                  tokenOut: state.buyTokenId,
                  // Every swap event reports the quote's smallest units, never
                  // the state's display amount: the two differ by the token's
                  // decimals, and a funnel mixing the scales cannot be summed.
                  amount: selectedQuote.sellAmount,
                  excludedDexs: excludedDexes,
                  ...getQuoteAnalyticsContext(selectedQuote),
                  ...(swapSessionId && { swapSessionId }),
                },
              }),
            ]);
          }),
        );
      },
    ),
  );

export const makeQuoteRefresh: SideEffect = (
  _,
  {
    swapFlow: { selectSwapFlowState$ },
    swapConfig: { selectSlippage$, selectExcludedDexes$ },
    tokens: { selectTokenById$ },
  },
  { actions, logger, swapProviders, isWalletActive$ },
) => {
  const notQuoted$ = selectSwapFlowState$.pipe(
    switchMap(state => (state.status !== 'Quoted' ? of(true) : [])),
  );

  // `whileActive` MUST stay at the end of the pipe. Mid-pipeline placement
  // leaves the downstream `switchMap`'s in-flight `interval` alive on lock —
  // it only blocks future outer emissions, not the already-running poll.
  // See ADR 29.
  return firstStateOfStatus(selectSwapFlowState$, 'Quoted').pipe(
    switchMap(state =>
      interval(QUOTE_REFRESH_INTERVAL_MS).pipe(
        takeUntil(notQuoted$),
        withLatestFrom(selectSlippage$, selectExcludedDexes$, selectTokenById$),
        switchMap(([, slippage, excludedDexes, selectTokenById]) => {
          const sellToken = (
            selectTokenById as (id: string) => { decimals: number } | undefined
          )(state.sellTokenId);
          const request: SwapQuoteRequest = {
            networkId: 'cardano',
            sellTokenId: state.sellTokenId,
            sellTokenDecimals: sellToken?.decimals ?? 0,
            buyTokenId: state.buyTokenId,
            sellAmount: state.sellAmount,
            slippage,
            excludedDexes,
            userAddress: '',
          };

          return fetchQuotesFromAllProviders(swapProviders, request).pipe(
            switchMap(results => {
              const quotes: SwapQuote[] = [];
              for (const r of results) {
                if (r?.isOk()) {
                  quotes.push(r.value);
                }
              }

              if (quotes.length === 0) {
                logger.error('Quote refresh: all providers failed');
                return of();
              }

              const selectedQuote = selectBestQuote(quotes);
              return of(
                actions.swapFlow.quotesRefreshed({ quotes, selectedQuote }),
              );
            }),
          );
        }),
      ),
    ),
    whileActive(isWalletActive$),
  );
};

export const makeBuildSwapTx: SideEffect = (
  _,
  {
    swapFlow: { selectSwapFlowState$ },
    swapConfig: { selectSlippage$, selectExcludedDexes$ },
    swapAnalytics: { selectSwapSessionId$ },
    addresses: { selectByAccountId$ },
    // The aggregator is offered `selectAvailableAccountUtxos$` + collateral,
    // never the raw tracked set: building on raw right after a swap re-offered
    // just-spent inputs and the node rejected the next tx with BadInputsUTxO.
    // The wider resolution set `inspectBuiltSwapTx` unions is not an offer.
    cardanoContext: {
      selectAccountUnspendableUtxos$,
      selectAccountUtxos$,
      selectAccountUtxosWithInFlight$,
      selectAvailableAccountUtxos$,
    },
  },
  { actions, logger, swapProviders },
) =>
  firstStateOfStatus(selectSwapFlowState$, 'Building').pipe(
    withLatestFrom(
      selectSlippage$,
      selectExcludedDexes$,
      selectByAccountId$,
      selectAvailableAccountUtxos$,
      selectAccountUnspendableUtxos$,
      selectAccountUtxos$,
      selectAccountUtxosWithInFlight$,
      selectSwapSessionId$,
    ),
    switchMap(
      ([
        state,
        slippage,
        excludedDexes,
        selectByAccountId,
        availableAccountUtxos,
        accountUnspendableUtxos,
        accountUtxos,
        accountUtxosWithInFlight,
        swapSessionId,
      ]) => {
        const targetProvider = swapProviders[0];

        if (!targetProvider) {
          return of(
            actions.swapFlow.buildFailed({
              errorMessage: 'v2.swap.error.no-provider-available',
            }),
          );
        }

        // Cardano-specific: get address and UTXOs for the account
        const accountAddresses = selectByAccountId(state.accountId);
        const userAddress = accountAddresses[0]?.address ?? '';

        // Restrict the UTXO set sent to the provider to only UTXOs at
        // addresses the signer can derive keys for — otherwise SteelSwap may
        // pick inputs we can't sign, producing `MissingVKeyWitnesses` on
        // submission. The root fix belongs in confirm-tx.ts (its
        // `knownAddresses` note): once that covers every address with a
        // tracked UTXO, this filter can be removed.
        const accountAddressSet = new Set<string>(
          accountAddresses.map(a => a.address),
        );
        const isSignable = (utxo: Cardano.Utxo): boolean =>
          accountAddressSet.has(utxo[1].address);

        const rawUtxos = (availableAccountUtxos[state.accountId] ?? []).filter(
          isSignable,
        );
        const rawCollateral = (
          accountUnspendableUtxos[state.accountId] ?? []
        ).filter(isSignable);

        // Serialize UTXOs to CBOR for the provider
        const utxos = rawUtxos.map(utxo =>
          Serialization.TransactionUnspentOutput.fromCore(utxo).toCbor(),
        );
        const collateralUtxos = rawCollateral.map(utxo =>
          Serialization.TransactionUnspentOutput.fromCore(utxo).toCbor(),
        );

        return targetProvider
          .buildSwapTx({
            quote: state.selectedQuote,
            slippage,
            userAddress,
            utxos,
            collateralUtxos,
            ttl: SWAP_TX_TTL_SECONDS,
          })
          .pipe(
            retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
            switchMap(result => {
              if (result.isOk()) {
                // Decoded here, while the UTxOs that resolve its inputs are
                // already in hand; the review renders this and the confirm
                // step re-derives it from the bytes it is about to sign.
                const inspection = inspectBuiltSwapTx({
                  accountId: state.accountId,
                  accountUnspendableUtxos,
                  accountUtxos,
                  accountUtxosWithInFlight,
                  quote: state.selectedQuote,
                  selectByAccountId,
                  serializedTx: result.value.unsignedTxCbor as HexBytes,
                  slippagePercent: slippage,
                });
                if (inspection.verdict === 'blocked')
                  logger.error(
                    'Built swap transaction does not match the reviewed intent',
                    inspection.violations,
                  );
                return from([
                  actions.swapFlow.buildCompleted({
                    inspection,
                    unsignedTxCbor: result.value.unsignedTxCbor,
                  }),
                  actions.analytics.trackEvent({
                    eventName: 'swaps | build tx',
                    payload: {
                      tokenIn: state.sellTokenId,
                      tokenOut: state.buyTokenId,
                      amount: state.selectedQuote.sellAmount,
                      excludedDexs: excludedDexes,
                      ...getQuoteAnalyticsContext(state.selectedQuote),
                      ...(swapSessionId && { swapSessionId }),
                    },
                  }),
                ]);
              }
              logger.error('Build swap TX failed', result.error);
              return from([
                actions.swapFlow.buildFailed({
                  errorMessage: result.error.message,
                }),
                actions.ui.showToast({
                  text: 'v2.swap.toast.build-failed.title',
                  subtitle: result.error.message,
                  color: 'negative',
                  leftIcon: { name: 'Cancel', size: 20 },
                }),
              ]);
            }),
            catchError(error => {
              logger.error('Build swap TX failed after retries', error);
              return from([
                actions.swapFlow.buildFailed({
                  errorMessage: String(error),
                }),
                actions.ui.showToast({
                  text: 'v2.swap.toast.build-failed.title',
                  subtitle: String(error),
                  color: 'negative',
                  leftIcon: { name: 'Cancel', size: 20 },
                }),
              ]);
            }),
          );
      },
    ),
  );

const QUOTE_DEBOUNCE_MS = 500;

export const makeAutoQuote: SideEffect = (
  _,
  { swapFlow: { selectSwapFlowState$ } },
  { actions },
) =>
  selectSwapFlowState$.pipe(
    filter((state): state is SwapStateIdle => state.status === 'Idle'),
    map(state => ({
      accountId: state.accountId,
      sellTokenId: state.sellTokenId,
      buyTokenId: state.buyTokenId,
      sellAmount: state.sellAmount,
    })),
    distinctUntilChanged(
      (previous, current) =>
        previous.sellTokenId === current.sellTokenId &&
        previous.buyTokenId === current.buyTokenId &&
        previous.sellAmount === current.sellAmount,
    ),
    debounceTime(QUOTE_DEBOUNCE_MS),
    filter(
      (
        state,
      ): state is {
        accountId: AccountId;
        sellTokenId: string;
        buyTokenId: string;
        sellAmount: string;
      } =>
        state.accountId !== undefined &&
        state.sellTokenId !== undefined &&
        state.buyTokenId !== undefined &&
        state.sellAmount !== undefined &&
        state.sellAmount !== '' &&
        Number(state.sellAmount) > 0,
    ),
    map(({ accountId, sellTokenId, buyTokenId, sellAmount }) =>
      actions.swapFlow.quoteRequested({
        accountId,
        sellTokenId,
        buyTokenId,
        sellAmount,
      }),
    ),
  );

export const makeFetchDexList: SideEffect = (
  _,
  { swapFlow: { selectSwapFlowState$ }, swapConfig: { selectAvailableDexes$ } },
  { actions, logger, swapProviders },
) =>
  firstStateOfStatus(selectSwapFlowState$, 'Idle').pipe(
    withLatestFrom(selectAvailableDexes$),
    switchMap(([, _currentDexes]) => {
      if (swapProviders.length === 0) return of();

      return forkJoin(
        swapProviders.map(provider =>
          provider.listDexes('cardano').pipe(
            timeout(QUOTE_TIMEOUT_MS),
            catchError(() => of(undefined)),
          ),
        ),
      ).pipe(
        switchMap(results => {
          const allDexes: SwapDexEntry[] = [];
          const seenIds = new Set<string>();
          for (const r of results) {
            if (r?.isOk()) {
              for (const dex of r.value) {
                if (!seenIds.has(dex.id)) {
                  seenIds.add(dex.id);
                  allDexes.push({ id: dex.id, name: dex.name });
                }
              }
            }
          }
          if (allDexes.length === 0) return of();
          return of(actions.swapConfig.setAvailableDexes(allDexes));
        }),
        catchError(error => {
          logger.error('Failed to fetch DEX list', error);
          return of();
        }),
      );
    }),
  );

export const makeFetchTradableTokens: SideEffect = (
  _,
  { swapFlow: { selectSwapFlowState$ } },
  { actions, logger, swapProviders },
) =>
  firstStateOfStatus(selectSwapFlowState$, 'Idle').pipe(
    switchMap(() => {
      if (swapProviders.length === 0) return of();

      return forkJoin(
        swapProviders.map(provider =>
          provider.listTokens('cardano').pipe(
            timeout(QUOTE_TIMEOUT_MS),
            catchError(() => of(undefined)),
          ),
        ),
      ).pipe(
        switchMap(results => {
          const tokenMap = new Map<string, SwapProviderToken>();
          for (const r of results) {
            if (r?.isOk()) {
              for (const token of r.value) {
                if (!tokenMap.has(token.id)) {
                  tokenMap.set(token.id, {
                    id: token.id,
                    ticker: token.ticker,
                    name: token.name,
                    decimals: token.decimals,
                    icon: token.icon,
                  });
                }
              }
            }
          }
          if (tokenMap.size === 0) return of();
          const allTokens = [...tokenMap.values()];
          const allIds = [...tokenMap.keys()];
          return from([
            actions.swapConfig.setTradableTokenIds(allIds),
            actions.swapConfig.setProviderTokens(allTokens),
          ]);
        }),
        catchError(error => {
          logger.error('Failed to fetch tradable tokens', error);
          return of();
        }),
      );
    }),
  );

export const makeAwaitConfirmation =
  ({ confirmTx }: { confirmTx: ConfirmTx }): SideEffect =>
  (
    _,
    {
      swapFlow: { selectSwapFlowState$ },
      swapAnalytics: { selectSwapSessionId$ },
      wallets: { selectAll$ },
    },
    { actions, logger },
  ) =>
    firstStateOfStatus(selectSwapFlowState$, 'AwaitingConfirmation').pipe(
      withLatestFrom(selectAll$, selectSwapSessionId$),
      switchMap(([state, wallets, swapSessionId]) => {
        const wallet = findWalletOwningAccount(
          wallets as readonly AnyWallet[],
          state.accountId,
        );
        const quoteContext = getQuoteAnalyticsContext(state.selectedQuote);
        const sessionContext: Record<string, string> =
          typeof swapSessionId === 'string' ? { swapSessionId } : {};

        if (!wallet) {
          logger.error('No wallet found for swap confirmation');
          return from([
            actions.swapFlow.confirmationFailed({
              errorMessage: 'v2.swap.error.no-wallet-found',
            }),
            actions.analytics.trackEvent({
              eventName: 'swaps | sign failure',
              payload: {
                reason: 'v2.swap.error.no-wallet-found',
                ...quoteContext,
                ...sessionContext,
              },
            }),
          ]);
        }

        /**
         * The gate is the build's inspection, carried in state beside the
         * bytes it describes (the state machine writes them together).
         *
         * Deliberately NOT a re-run of the rule against freshly read UTxOs:
         * a re-run's inputs come from the same store as the verdict it would
         * check, so it adds no protection, while a UTxO set that shifted
         * since the build would make own inputs unresolvable and refuse an
         * honest swap.
         */
        if (state.inspection.verdict === 'blocked') {
          logger.error(
            'Swap transaction does not match the reviewed intent',
            state.inspection.violations,
          );
          const reason = state.inspection.violations
            .map(violation => violation.code)
            .join(', ');
          return from([
            actions.swapFlow.confirmationFailed({
              errorMessage: 'v2.swap.error.intent-mismatch',
            }),
            actions.analytics.trackEvent({
              eventName: 'swaps | sign failure',
              payload: {
                reason: `intentMismatch: ${reason}`,
                ...quoteContext,
                ...sessionContext,
              },
            }),
          ]);
        }

        return confirmTx(
          {
            accountId: state.accountId,
            blockchainName: 'Cardano',
            blockchainSpecificSendFlowData: {},
            serializedTx: state.unsignedTxCbor,
            wallet,
          },
          result => {
            if (result.success) {
              return actions.swapFlow.confirmationCompleted({
                serializedTx: result.serializedTx,
              });
            }
            return actions.swapFlow.confirmationFailed({
              errorMessage:
                result.error?.message ?? 'v2.swap.error.signing-failed',
            });
          },
        ).pipe(
          mergeMap(action => {
            if (action.type === actions.swapFlow.confirmationFailed.type) {
              return from([
                action,
                actions.analytics.trackEvent({
                  eventName: 'swaps | sign failure',
                  payload: {
                    reason: action.payload.errorMessage,
                    ...quoteContext,
                    ...sessionContext,
                  },
                }),
              ]);
            }
            return of(action);
          }),
          catchError(error => {
            logger.error('Swap confirmation failed', error);
            const reason = serializeError(error).message ?? String(error);
            return from([
              actions.swapFlow.confirmationFailed({ errorMessage: reason }),
              actions.analytics.trackEvent({
                eventName: 'swaps | sign failure',
                payload: { reason, ...quoteContext, ...sessionContext },
              }),
            ]);
          }),
        );
      }),
    );

export const makeProcessing =
  ({ submitTx }: { submitTx: SubmitTx }): SideEffect =>
  (
    _,
    {
      swapFlow: { selectSwapFlowState$ },
      swapConfig: { selectSlippage$ },
      swapAnalytics: { selectSwapSessionId$ },
      tokenPricing: { selectPrices$ },
      tokens: { selectTokenById$ },
    },
    { actions, logger },
  ) =>
    firstStateOfStatus(selectSwapFlowState$, 'Processing').pipe(
      withLatestFrom(selectSlippage$, selectSwapSessionId$),
      blockingWithLatestFrom(combineLatest([selectPrices$, selectTokenById$])),
      switchMap(
        ([[state, slippage, swapSessionId], [prices, selectTokenById]]) => {
          const quoteContext = getQuoteAnalyticsContext(state.selectedQuote);
          const valueContext = getSwapValueAnalytics(
            state.selectedQuote,
            selectTokenById(state.selectedQuote.sellTokenId),
            prices,
          );
          const sessionContext: Record<string, string> =
            typeof swapSessionId === 'string' ? { swapSessionId } : {};
          return submitTx(
            {
              accountId: state.accountId,
              serializedTx: state.serializedTx,
              blockchainName: 'Cardano',
              blockchainSpecificSendFlowData: {},
            },
            result => result,
          ).pipe(
            mergeMap(value => {
              if (!('success' in value)) {
                return of(value);
              }

              if (value.success) {
                // Record the swap as a pending activity (as Send does on
                // submit): its consumed inputs drop out of
                // `selectAvailableAccountUtxos` immediately, so a back-to-back
                // swap can't offer just-spent inputs to the aggregator — the
                // node rejected those with BadInputsUTxO until chain sync
                // caught up. Also surfaces the swap in Activity right away.
                const tokenBalanceChanges: Activity['tokenBalanceChanges'] = [];
                try {
                  tokenBalanceChanges.push({
                    tokenId: TokenId(state.sellTokenId),
                    amount: BigNumber(-BigInt(state.selectedQuote.sellAmount)),
                  });
                } catch {
                  // An unparsable provider amount must not block the submit
                  // result; the activity just shows no token delta.
                }
                const pendingActivity: Activity = {
                  accountId: state.accountId,
                  activityId: value.txId,
                  timestamp: Timestamp(Date.now()),
                  tokenBalanceChanges,
                  type: ActivityType.Pending,
                  ...pendingActivityMetadata(value),
                };
                return from([
                  actions.swapFlow.submissionSucceeded({ txId: value.txId }),
                  actions.activities.upsertActivities({
                    accountId: state.accountId,
                    activities: [pendingActivity],
                  }),
                  actions.analytics.trackEvent({
                    eventName: 'swaps | sign success',
                    payload: {
                      tokenIn: state.sellTokenId,
                      tokenOut: state.buyTokenId,
                      // The quote's lovelace, not the state's display amount:
                      // `expectedBuyAmount` below is smallest-unit, and one payload
                      // reporting two amounts on two scales cannot be summed.
                      quantity: state.selectedQuote.sellAmount,
                      expectedBuyAmount: state.selectedQuote.expectedBuyAmount,
                      quotedPrice: state.selectedQuote.price,
                      targetSlippage: slippage.toString(),
                      txId: value.txId,
                      ...quoteContext,
                      ...sessionContext,
                      ...valueContext,
                    },
                  }),
                ]);
              }

              const reason =
                value.error?.message ?? 'v2.swap.error.submission-failed';
              return from([
                actions.swapFlow.submissionFailed({ errorMessage: reason }),
                actions.analytics.trackEvent({
                  eventName: 'swaps | sign failure',
                  payload: { reason, ...quoteContext, ...sessionContext },
                }),
              ]);
            }),
            catchError(error => {
              logger.error('Swap submission failed', error);
              const reason = String(error);
              return from([
                actions.swapFlow.submissionFailed({ errorMessage: reason }),
                actions.analytics.trackEvent({
                  eventName: 'swaps | sign failure',
                  payload: { reason, ...quoteContext, ...sessionContext },
                }),
              ]);
            }),
          );
        },
      ),
    );

/**
 * Mints a fresh `swapSessionId` whenever the swap UI mounts or unmounts (the
 * `swapFlow.reset` action is dispatched from the SwapCenter screen's
 * `useFocusEffect` on entry and blur). Every funnel event emitted while the
 * session is active carries this id, so PostHog can compute drop-off across
 * `select token → fetch estimate → review tx → sign success/failure` for a
 * single attempt without false joins from prior sessions.
 */
export const rotateSwapSession: SideEffect = (
  { swapFlow: { reset$ } },
  _,
  { actions, uuid },
) => reset$.pipe(map(() => actions.swapAnalytics.swapSessionStarted(uuid())));

export const swapContextSideEffects = [
  makeAutoQuote,
  makeFetchDexList,
  makeFetchTradableTokens,
  makeFetchQuote,
  makeQuoteRefresh,
  makeBuildSwapTx,
  rotateSwapSession,
];
