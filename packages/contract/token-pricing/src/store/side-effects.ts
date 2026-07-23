import { whileActive } from '@lace-contract/wallet-active-state';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { createByBlockchainNameSelector } from '@lace-lib/util-store';
import { retryBackoff } from 'backoff-rxjs';
import {
  concat,
  catchError,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
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
  SUPPORTED_CURRENCIES_FEATURE_FLAG,
  TOKEN_PRICING_NETWORK_TYPE,
} from '../const';
import { shouldFetchPrice, shouldFetchPriceHistory } from '../utils';

import type { CurrencyChoiceFeatureFlagPayload } from '../const';
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
  priceInUsd: response.priceInUsd,
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

/**
 * Fetches CoinGecko's supported vs_currencies list — which gates the selectable
 * currencies — on each wallet activation, storing it in Redux.
 *
 * Per-activation refetching (repeats absorbed by the provider's TTL cache) keeps
 * a currency CoinGecko later drops from staying selectable for the rest of the
 * session; a boot-time outage recovers on the next activation.
 */
export const fetchAndStoreSupportedCurrencies: SideEffect = (
  _,
  {},
  { tokenPricingProvider, actions, logger, isWalletActive$ },
) => {
  if (!tokenPricingProvider?.fetchSupportedCurrencies) return EMPTY;

  return isWalletActive$.pipe(
    filter(Boolean),
    exhaustMap(() =>
      tokenPricingProvider.fetchSupportedCurrencies!().pipe(
        retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
        map(currencies =>
          actions.tokenPricing.setSupportedCurrencies(currencies),
        ),
        catchError(error => {
          logger.error(
            'Failed to fetch supported currencies from CoinGecko:',
            error,
          );
          return EMPTY;
        }),
      ),
    ),
  );
};

/**
 * Mirrors the SUPPORTED_CURRENCIES feature-flag payload's
 * `currency_choice_exclusions` into the token-pricing slice, so the currency
 * selector and the fallback side-effect read the hide-list from one place.
 */
export const syncCurrencyChoiceExclusions: SideEffect = (
  _,
  { features: { selectLoadedFeatures$, selectNextFeatureFlags$ } },
  { actions },
) => {
  const getExclusions = (
    featureFlags: { key: string; payload?: unknown }[],
  ): string[] => {
    const flag = featureFlags.find(
      f => f.key === SUPPORTED_CURRENCIES_FEATURE_FLAG,
    );
    const payload = flag?.payload as
      | CurrencyChoiceFeatureFlagPayload
      | undefined;
    const exclusions = payload?.currency_choice_exclusions;
    return Array.isArray(exclusions)
      ? exclusions.map(code => code.toLowerCase())
      : [];
  };

  return merge(
    selectLoadedFeatures$.pipe(
      map(({ featureFlags }) => getExclusions(featureFlags)),
    ),
    selectNextFeatureFlags$.pipe(
      filter(Boolean),
      map(({ features }) => getExclusions(features)),
    ),
  ).pipe(
    distinctUntilChanged(
      (a, b) =>
        a.length === b.length && a.every((code, index) => code === b[index]),
    ),
    map(exclusions =>
      actions.tokenPricing.setCurrencyChoiceExclusions(exclusions),
    ),
  );
};

/**
 * Moves the user off a currency they can no longer select (as decided by
 * `selectCurrencyFallback`), silently — see `CurrencyFallbackDecision` for why
 * the CoinGecko-removal case is not distinguishable enough to report.
 *
 * Gated on wallet activity: the correction dispatches setCurrencyPreference,
 * which drives an on-demand price fetch that must not run while locked (ADR 25).
 * `whileActive` stays at the end of the pipe.
 */
export const fallbackCurrencyWhenUnsupported: SideEffect = (
  _,
  { tokenPricing },
  { actions, isWalletActive$ },
) =>
  (
    tokenPricing.selectCurrencyFallback$ ?? of({ fallback: false as const })
  ).pipe(
    filter(decision => decision.fallback),
    switchMap(() =>
      of(
        actions.tokenPricing.setCurrencyPreference(DEFAULT_CURRENCY_PREFERENCE),
      ),
    ),
    whileActive(isWalletActive$),
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
    { tokenPricingProvider, actions, logger, isWalletActive$ },
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

    // `whileActive` MUST stay at the end of the pipe. Mid-pipeline placement
    // leaves the downstream `switchMap`'s in-flight `interval` alive on lock —
    // it only blocks future outer emissions, not the already-running poll.
    // See ADR 25.
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
      whileActive(isWalletActive$),
    );
  };

/**
 * Fetch prices immediately when new tokens appear or when existing prices are stale.
 *
 * Not gated on `isWalletActive$` — qualifies for ADR 25's state-cascade pattern.
 * `selectAggregatedFungibleTokensForVisibleAccounts$` is mutated only by
 * blockchain producers (Cardano `tokens` slice via `cardano-context`, Bitcoin
 * via `blockchain-bitcoin`, Midnight via `blockchain-midnight`), all of which
 * are themselves gated on `isWalletActive$`. With every producer paused while
 * locked, this selector cannot emit during lock — so no fetch fires.
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
 *
 * Not gated on `isWalletActive$` — qualifies for ADR 25's UI-action-cascade
 * pattern. `setCurrencyPreference$` is dispatched only from the wallet UI
 * fiat-currency selector; the lock screen blocks all UI interaction, so this
 * action cannot fire while locked.
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
    { tokenPricingProvider, actions, logger, isWalletActive$ },
  ) => {
    if (!tokenPricingProvider) return EMPTY;
    const currencyPreference$ =
      tokenPricing.selectCurrencyPreference$ ?? of(DEFAULT_CURRENCY_PREFERENCE);

    const isSynced$ = selectGlobalSyncStatus$.pipe(
      map(status => status === 'synced' || status === 'idle'),
      distinctUntilChanged(),
    );

    // Gated on `isWalletActive$` because an in-flight Cardano sync round can
    // complete during lock (HTTP responses arriving after the gate flipped),
    // transitioning `isSynced$` to `true` and triggering a price-history fetch.
    // The gate also has a useful byproduct on unlock: a fresh subscription
    // re-evaluates the price-history TTL, so cached entries that expired during
    // a long lock window are refetched. See ADR 25.
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
      whileActive(isWalletActive$),
    );
  };

/**
 * Fetch price history on demand (e.g. when the user opens a token detail view).
 *
 * Not gated on `isWalletActive$` — qualifies for ADR 25's UI-action-cascade
 * pattern. `requestPriceHistory$` is dispatched only from UI hooks, and the
 * lock screen blocks all UI interaction, so this action cannot fire while
 * locked.
 */
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
    fetchAndStoreSupportedCurrencies,
    syncCurrencyChoiceExclusions,
    fallbackCurrencyWhenUnsupported,
    makePollPrices(selectMapper),
    makeFetchPricesForNewTokens(selectMapper),
    makeFetchPricesOnDemand(selectMapper),
    makeFetch24HPriceHistoryOnSync(selectMapper),
    makeFetchPriceHistoryOnDemand(selectMapper),
  ];
};
