import { Serialization } from '@cardano-sdk/core';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { firstStateOfStatus, serializeError } from '@lace-lib/util-store';
import { retryBackoff } from 'backoff-rxjs';
import {
  catchError,
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

import type {
  SwapDexEntry,
  SwapProviderToken,
  SwapStateBuilding,
  SwapStateIdle,
  SwapStateQuoting,
} from './types';
import type { SideEffect } from '../contract';
import type { Cardano } from '@cardano-sdk/core';
import type {
  SwapProvider,
  SwapQuote,
  SwapQuoteRequest,
} from '@lace-contract/swap-provider';
import type { ConfirmTx, SubmitTx } from '@lace-contract/tx-executor';
import type { AnyWallet, AccountId } from '@lace-contract/wallet-repo';

const QUOTE_REFRESH_INTERVAL_MS = 15_000;
const QUOTE_TIMEOUT_MS = 30_000;
const SWAP_TX_TTL_SECONDS = 900;

const selectBestQuote = (quotes: SwapQuote[]): SwapQuote =>
  quotes.reduce((best, current) =>
    BigInt(current.expectedBuyAmount) > BigInt(best.expectedBuyAmount)
      ? current
      : best,
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
    tokens: { selectTokenById$ },
  },
  { actions, logger, swapProviders },
) =>
  firstStateOfStatus(selectSwapFlowState$, 'Quoting').pipe(
    withLatestFrom(selectSlippage$, selectExcludedDexes$, selectTokenById$),
    switchMap(
      ([state, slippage, excludedDexes, selectTokenById]: [
        SwapStateQuoting,
        number,
        string[],
        (tokenId: string) => { decimals: number } | undefined,
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
              if (r !== undefined && r.isOk()) {
                quotes.push(r.value);
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
                  amount: state.sellAmount,
                  excludedDexs: excludedDexes,
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
  { actions, logger, swapProviders },
) => {
  const notQuoted$ = selectSwapFlowState$.pipe(
    switchMap(state => (state.status !== 'Quoted' ? of(true) : [])),
  );

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
                if (r !== undefined && r.isOk()) {
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
  );
};

export const makeBuildSwapTx: SideEffect = (
  _,
  {
    swapFlow: { selectSwapFlowState$ },
    swapConfig: { selectSlippage$, selectExcludedDexes$ },
    addresses: { selectByAccountId$ },
    cardanoContext: { selectAccountUtxos$, selectAccountUnspendableUtxos$ },
  },
  { actions, logger, swapProviders },
) =>
  firstStateOfStatus(selectSwapFlowState$, 'Building').pipe(
    withLatestFrom(
      selectSlippage$,
      selectExcludedDexes$,
      selectByAccountId$,
      selectAccountUtxos$,
      selectAccountUnspendableUtxos$,
    ),
    switchMap(
      ([
        state,
        slippage,
        excludedDexes,
        selectByAccountId,
        accountUtxos,
        accountUnspendableUtxos,
      ]: [SwapStateBuilding, number, string[], ...unknown[]]) => {
        const targetProvider = swapProviders[0];

        if (!targetProvider) {
          return of(
            actions.swapFlow.buildFailed({
              errorMessage: 'v2.swap.error.no-provider-available',
            }),
          );
        }

        // Cardano-specific: get address and UTXOs for the account
        const accountAddresses = (
          selectByAccountId as (
            accountId: string,
          ) => Array<{ address: string }> | undefined
        )(state.accountId);
        const userAddress = accountAddresses?.[0]?.address ?? '';

        const utxoMap = accountUtxos as Record<string, Cardano.Utxo[]>;
        const unspendableMap = accountUnspendableUtxos as Record<
          string,
          Cardano.Utxo[]
        >;

        // Restrict the UTXO set sent to the provider to only UTXOs at
        // addresses the signer can derive keys for — otherwise SteelSwap may
        // pick inputs we can't sign, producing `MissingVKeyWitnesses` on
        // submission. The root fix belongs in confirm-tx.ts (see the
        // `// TODO: We need account known addresses here.` there): once
        // `knownAddresses` covers every address with a tracked UTXO, this
        // filter can be removed.
        const accountAddressSet = new Set(
          (accountAddresses ?? []).map(a => a.address),
        );
        const isSignable = (utxo: Cardano.Utxo): boolean =>
          accountAddressSet.has(utxo[1].address);

        const rawUtxos = (utxoMap[state.accountId] ?? []).filter(isSignable);
        const rawCollateral = (unspendableMap[state.accountId] ?? []).filter(
          isSignable,
        );

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
                return from([
                  actions.swapFlow.buildCompleted({
                    unsignedTxCbor: result.value.unsignedTxCbor,
                  }),
                  actions.analytics.trackEvent({
                    eventName: 'swaps | build tx',
                    payload: {
                      tokenIn: state.sellTokenId,
                      tokenOut: state.buyTokenId,
                      amount: state.sellAmount,
                      excludedDexs: excludedDexes,
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
            if (r !== undefined && r.isOk()) {
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
            if (r !== undefined && r.isOk()) {
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
    { swapFlow: { selectSwapFlowState$ }, wallets: { selectAll$ } },
    { actions, logger },
  ) =>
    firstStateOfStatus(selectSwapFlowState$, 'AwaitingConfirmation').pipe(
      withLatestFrom(selectAll$),
      switchMap(([state, wallets]) => {
        const allWallets = wallets as readonly AnyWallet[];
        const wallet = allWallets.find(w =>
          w.accounts.some(a => a.accountId === state.accountId),
        );

        if (!wallet) {
          logger.error('No wallet found for swap confirmation');
          return from([
            actions.swapFlow.confirmationFailed({
              errorMessage: 'v2.swap.error.no-wallet-found',
            }),
            actions.analytics.trackEvent({
              eventName: 'swaps | sign failure',
              payload: { reason: 'v2.swap.error.no-wallet-found' },
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
                  payload: { reason: action.payload.errorMessage },
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
                payload: { reason },
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
    { swapFlow: { selectSwapFlowState$ }, swapConfig: { selectSlippage$ } },
    { actions, logger },
  ) =>
    firstStateOfStatus(selectSwapFlowState$, 'Processing').pipe(
      withLatestFrom(selectSlippage$),
      switchMap(([state, slippage]) => {
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
              return from([
                actions.swapFlow.submissionSucceeded({ txId: value.txId }),
                actions.analytics.trackEvent({
                  eventName: 'swaps | sign success',
                  payload: {
                    tokenIn: state.sellTokenId,
                    tokenOut: state.buyTokenId,
                    quantity: state.sellAmount,
                    targetSlippage: slippage.toString(),
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
                payload: { reason },
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
                payload: { reason },
              }),
            ]);
          }),
        );
      }),
    );

export const swapContextSideEffects = [
  makeAutoQuote,
  makeFetchDexList,
  makeFetchTradableTokens,
  makeFetchQuote,
  makeQuoteRefresh,
  makeBuildSwapTx,
];
