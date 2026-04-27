import { createByBlockchainNameSelector } from '@lace-lib/util-store';
import {
  concat,
  catchError,
  distinctUntilChanged,
  EMPTY,
  filter,
  interval,
  map,
  merge,
  of,
  startWith,
  switchMap,
  withLatestFrom,
} from 'rxjs';

import {
  DEFAULT_CURRENCY_PREFERENCE,
  POLLING_INTERVAL_MS,
  TOKEN_PRICING_NETWORK_TYPE,
} from '../const';
import { shouldFetchPrice, shouldFetchPriceHistory } from '../utils';

import type { ActionCreators, SideEffect } from '../contract';
import type { TokenPricingProvider } from '../dependencies';
import type {
  TimeRange,
  TokenIdMapper,
  TokenPrice,
  TokenPriceRequest,
  TokenPriceResponse,
} from '../types';
import type { LaceInit } from '@lace-contract/module';
import type { Token } from '@lace-contract/tokens';
import type { ByBlockchainNameSelector } from '@lace-lib/util-store';
import type { Logger } from 'ts-log';

type FetchAndSetPrices = {
  tokenPricingProvider: TokenPricingProvider;
  requests: TokenPriceRequest[];
  actions: ActionCreators;
  logger: Logger;
};

type FetchAndSetPriceHistory = {
  tokenPricingProvider: TokenPricingProvider;
  requests: TokenPriceRequest[];
  timeRange: TimeRange;
  actions: ActionCreators;
  logger: Logger;
};

/**
 * Prepare token price requests for all tokens using the appropriate mapper.
 * Each token is mapped using the mapper for its blockchain.
 */
const prepareTokenRequests = (
  tokens: Token[],
  fiatCurrency: string,
  selectMapper: ByBlockchainNameSelector<TokenIdMapper>,
): TokenPriceRequest[] => {
  return tokens
    .map(token => {
      const mapper = selectMapper(token.blockchainName);
      return mapper?.getTokenPriceRequest(token, fiatCurrency) ?? null;
    })
    .filter((request): request is TokenPriceRequest => request !== null);
};

const responseToPrice = (
  response: TokenPriceResponse,
  timestamp: number,
): TokenPrice => ({
  priceId: response.priceId,
  blockchain: response.blockchain,
  identifier: response.identifier,
  price: response.price,
  fiatCurrency: response.fiatCurrency,
  change24h: response.change24h,
  lastUpdated: timestamp,
  isStale: false,
});

const fetchAndSetPrices = ({
  tokenPricingProvider,
  actions,
  requests,
  logger,
}: FetchAndSetPrices) =>
  tokenPricingProvider.fetchPrices(requests).pipe(
    map(responses => {
      const timestamp = Date.now();
      const prices = responses.map(r => responseToPrice(r, timestamp));
      return actions.tokenPricing.setPrices({ prices, timestamp });
    }),
    catchError(error => {
      logger.error('Failed to fetch token prices:', error);
      return of(
        actions.tokenPricing.setError({
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
          },
        }),
      );
    }),
  );

const fetchAndSetPriceHistory = ({
  tokenPricingProvider,
  requests,
  timeRange,
  actions,
  logger,
}: FetchAndSetPriceHistory) =>
  tokenPricingProvider.fetchPriceHistory(requests, timeRange).pipe(
    switchMap(responses =>
      merge(
        ...responses.map(response =>
          of(
            actions.tokenPricing.setPriceHistory({
              priceId: response.priceId,
              timeRange: response.timeRange,
              data: response.data,
              timestamp: Date.now(),
            }),
          ),
        ),
      ),
    ),
    catchError(error => {
      logger.error('Failed to fetch price history:', error);
      return EMPTY;
    }),
  );

export const clearPricesWhenDisabled: SideEffect = (
  _,
  {},
  { tokenPricingProvider, actions },
) => {
  if (!tokenPricingProvider) {
    return merge(
      of(actions.tokenPricing.clearPrices()),
      of(actions.tokenPricing.clearPriceHistory()),
    );
  }

  return EMPTY;
};

/**
 * Clears all pricing data when switching to testnet.
 * Token prices are available only on mainnet.
 */
export const clearPricingDataOnTestnet: SideEffect = (
  _,
  { network: { selectNetworkType$ } },
  { actions },
) =>
  selectNetworkType$.pipe(
    distinctUntilChanged(),
    filter(networkType => networkType !== TOKEN_PRICING_NETWORK_TYPE),
    switchMap(() =>
      merge(
        of(actions.tokenPricing.clearPrices()),
        of(actions.tokenPricing.clearPriceHistory()),
      ),
    ),
  );

export const makePollPrices =
  (selectMapper: ByBlockchainNameSelector<TokenIdMapper>): SideEffect =>
  (
    _,
    {
      sync: { selectGlobalSyncStatus$ },
      tokens: { selectAggregatedFungibleTokensForVisibleAccounts$ },
      tokenPricing,
      network: { selectNetworkType$ },
    },
    { tokenPricingProvider, actions, logger },
  ) => {
    // Return immediately if provider is not available (feature flag is off)
    if (!tokenPricingProvider) return EMPTY;

    // Only poll when synced
    const isSynced$ = selectGlobalSyncStatus$.pipe(
      map(status => status === 'synced' || status === 'idle'),
      distinctUntilChanged(),
    );

    const currencyPreference$ =
      tokenPricing.selectCurrencyPreference$ ?? of(DEFAULT_CURRENCY_PREFERENCE);

    return isSynced$.pipe(
      filter(Boolean),
      switchMap(() =>
        interval(POLLING_INTERVAL_MS).pipe(
          startWith(0),
          withLatestFrom(
            selectAggregatedFungibleTokensForVisibleAccounts$,
            tokenPricing.selectPrices$,
            currencyPreference$,
            selectNetworkType$,
          ),
          filter(
            ([, , , , networkType]) =>
              networkType === TOKEN_PRICING_NETWORK_TYPE,
          ),
          switchMap(([, tokens, prices, currencyPreference]) => {
            if (tokens.length === 0) {
              return EMPTY;
            }

            // Convert to price requests using mappers and filter by TTL - only fetch stale prices
            const requests = prepareTokenRequests(
              tokens,
              currencyPreference.name,
              selectMapper,
            ).filter(request => shouldFetchPrice(prices[request.priceId]));

            if (requests.length === 0) {
              return EMPTY;
            }

            return merge(
              of(actions.tokenPricing.startUpdate()),
              fetchAndSetPrices({
                tokenPricingProvider,
                requests,
                actions,
                logger,
              }),
            );
          }),
        ),
      ),
    );
  };

/**
 * Fetch prices immediately when new tokens appear or when existing prices are stale
 */
export const makeFetchPricesForNewTokens =
  (selectMapper: ByBlockchainNameSelector<TokenIdMapper>): SideEffect =>
  (
    _,
    {
      tokens: { selectAggregatedFungibleTokensForVisibleAccounts$ },
      tokenPricing,
      network: { selectNetworkType$ },
    },
    { tokenPricingProvider, actions, logger },
  ) => {
    // Return immediately if provider is not available (feature flag is off)
    if (!tokenPricingProvider) return EMPTY;

    const currencyPreference$ =
      tokenPricing.selectCurrencyPreference$ ?? of(DEFAULT_CURRENCY_PREFERENCE);

    return selectAggregatedFungibleTokensForVisibleAccounts$.pipe(
      withLatestFrom(
        tokenPricing.selectPrices$,
        currencyPreference$,
        selectNetworkType$,
      ),
      filter(
        ([, , , networkType]) => networkType === TOKEN_PRICING_NETWORK_TYPE,
      ),
      switchMap(([tokens, prices, currencyPreference]) => {
        // Map tokens to requests and filter those that need fetching based on TTL
        const requests = prepareTokenRequests(
          tokens,
          currencyPreference.name,
          selectMapper,
        ).filter(request => shouldFetchPrice(prices[request.priceId]));

        if (requests.length === 0) {
          return EMPTY;
        }

        return fetchAndSetPrices({
          tokenPricingProvider,
          requests,
          actions,
          logger,
        });
      }),
    );
  };

/**
 * Fetch prices on demand (e.g. when fiat currency changes).
 */
export const makeFetchPricesOnDemand =
  (selectMapper: ByBlockchainNameSelector<TokenIdMapper>): SideEffect =>
  (
    actionObservables,
    {
      tokens: { selectAggregatedFungibleTokensForVisibleAccounts$ },
      tokenPricing: { selectCurrencyPreference$ },
      network: { selectNetworkType$ },
    },
    { tokenPricingProvider, actions, logger },
  ) => {
    if (!tokenPricingProvider) return EMPTY;
    const currencyPreference$ =
      selectCurrencyPreference$ ?? of(DEFAULT_CURRENCY_PREFERENCE);

    return actionObservables.tokenPricing.setCurrencyPreference$.pipe(
      withLatestFrom(
        selectAggregatedFungibleTokensForVisibleAccounts$,
        currencyPreference$,
        selectNetworkType$,
      ),
      filter(
        ([, , , networkType]) => networkType === TOKEN_PRICING_NETWORK_TYPE,
      ),
      switchMap(([, tokens, currencyPreference]) => {
        const requests = prepareTokenRequests(
          tokens,
          currencyPreference.name,
          selectMapper,
        );

        const refreshPrices$ =
          requests.length === 0
            ? EMPTY
            : concat(
                of(actions.tokenPricing.startUpdate()),
                fetchAndSetPrices({
                  tokenPricingProvider,
                  requests,
                  actions,
                  logger,
                }),
              );

        return concat(of(actions.tokenPricing.clearPrices()), refreshPrices$);
      }),
    );
  };

export const makeFetch24HPriceHistoryOnSync =
  (selectMapper: ByBlockchainNameSelector<TokenIdMapper>): SideEffect =>
  (
    _,
    {
      sync: { selectGlobalSyncStatus$ },
      tokens: { selectAggregatedFungibleTokensForVisibleAccounts$ },
      tokenPricing,
      network: { selectNetworkType$ },
    },
    { tokenPricingProvider, actions, logger },
  ) => {
    if (!tokenPricingProvider) return EMPTY;
    const currencyPreference$ =
      tokenPricing.selectCurrencyPreference$ ?? of(DEFAULT_CURRENCY_PREFERENCE);

    const isSynced$ = selectGlobalSyncStatus$.pipe(
      map(status => status === 'synced' || status === 'idle'),
      distinctUntilChanged(),
    );

    return isSynced$.pipe(
      filter(Boolean),
      switchMap(() =>
        selectAggregatedFungibleTokensForVisibleAccounts$.pipe(
          withLatestFrom(
            tokenPricing.selectPriceHistory$,
            currencyPreference$,
            selectNetworkType$,
          ),
          filter(
            ([, , , networkType]) => networkType === TOKEN_PRICING_NETWORK_TYPE,
          ),
          switchMap(([tokens, priceHistory, currencyPreference]) => {
            const timeRange: TimeRange = '24H';

            const requests = prepareTokenRequests(
              tokens,
              currencyPreference.name,
              selectMapper,
            ).filter(request =>
              shouldFetchPriceHistory(priceHistory[request.priceId], timeRange),
            );

            if (requests.length === 0) {
              return EMPTY;
            }

            return fetchAndSetPriceHistory({
              tokenPricingProvider,
              requests,
              timeRange,
              actions,
              logger,
            });
          }),
        ),
      ),
    );
  };

export const makeFetchPriceHistoryOnDemand =
  (selectMapper: ByBlockchainNameSelector<TokenIdMapper>): SideEffect =>
  (
    actionObservables,
    {
      tokens: { selectAggregatedFungibleTokensForVisibleAccounts$ },
      tokenPricing,
      network: { selectNetworkType$ },
    },
    { tokenPricingProvider, actions, logger },
  ) => {
    if (!tokenPricingProvider) return EMPTY;
    const currencyPreference$ =
      tokenPricing.selectCurrencyPreference$ ?? of(DEFAULT_CURRENCY_PREFERENCE);

    return actionObservables.tokenPricing.requestPriceHistory$.pipe(
      withLatestFrom(
        selectAggregatedFungibleTokensForVisibleAccounts$,
        tokenPricing.selectPriceHistory$,
        currencyPreference$,
        selectNetworkType$,
      ),
      filter(
        ([, , , , networkType]) => networkType === TOKEN_PRICING_NETWORK_TYPE,
      ),
      switchMap(([action, tokens, priceHistory, currencyPreference]) => {
        const { timeRange } = action.payload;

        const requests = prepareTokenRequests(
          tokens,
          currencyPreference.name,
          selectMapper,
        ).filter(request =>
          shouldFetchPriceHistory(priceHistory[request.priceId], timeRange),
        );

        if (requests.length === 0) {
          return EMPTY;
        }

        return fetchAndSetPriceHistory({
          tokenPricingProvider,
          requests,
          timeRange,
          actions,
          logger,
        });
      }),
    );
  };

export const initializeSideEffects: LaceInit<SideEffect[]> = async ({
  loadModules,
}) => {
  const selectMapper = await createByBlockchainNameSelector(
    loadModules('addons.loadTokenIdMapper'),
  );

  return [
    clearPricesWhenDisabled,
    clearPricingDataOnTestnet,
    makePollPrices(selectMapper),
    makeFetchPricesForNewTokens(selectMapper),
    makeFetchPricesOnDemand(selectMapper),
    makeFetch24HPriceHistoryOnSync(selectMapper),
    makeFetchPriceHistoryOnDemand(selectMapper),
  ];
};
