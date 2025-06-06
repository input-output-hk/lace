/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {
  map,
  from,
  combineLatest,
  Observable,
  startWith,
  mergeMap,
  scan,
  auditTime,
  switchMap,
  EMPTY,
  repeatWhen,
  timer,
  takeWhile,
  shareReplay,
  ReplaySubject,
  take,
  of,
  filter
} from 'rxjs';
import { storage } from 'webextension-polyfill';
import { TokenPrices, Status, MaybeTokenPrice } from '../../types';
import { Cardano, Milliseconds } from '@cardano-sdk/core';
import { config } from '@src/config';
import Bottleneck from 'bottleneck';
import { ActiveWallet } from '@cardano-sdk/web-extension';
import { ObservableWallet } from '@cardano-sdk/wallet';
import { mayBeNFT } from '@src/utils/is-nft';

/** The subset of token data from CoinGecko relevant for Lace to show token prices. */
type PriceData = [priceInAda: number, priceVariationPercentage24h: number];

/** The structure to store token data and when given data for a token was fetched optimized to have the thinnest size once stringified. */
type FetchedPriceData = [lastFetchTime: number, priceData?: PriceData];
/**
 * Data emitted from the service
 */
type TokenPricesState = { tokens: TokenPrices } & Status;
/**
 * Given the total amount of token prices data is quite small, rather than fetching it from cache every time it is required,
 * the entire data is cached in RAM by `priceData` to make read accesses as cheap as possible.
 *
 * Write accesses are centralized through `updatePriceData` to ensure data consistency.
 */
type PriceCache = Record<Cardano.AssetId, FetchedPriceData>;
type PriceListItem = [Cardano.AssetId, MaybeTokenPrice];
type PriceList = PriceListItem[];
type PriceMap = Map<Cardano.AssetId, MaybeTokenPrice>;

const CACHE_KEY = 'cardano-token-prices';
const { TOKEN_PRICE_CHECK_INTERVAL } = config();
// eslint-disable-next-line no-magic-numbers, new-cap
const TOKEN_PRICE_EMIT_THROTTLE_FREQUENCY = Milliseconds(1000);

const rateLimiterSettings: Bottleneck.ConstructorOptions = {
  reservoir: 5,
  reservoirIncreaseAmount: 2,
  reservoirIncreaseInterval: 1000,
  reservoirIncreaseMaximum: 5
};
const rateLimiter = new Bottleneck(rateLimiterSettings);

const priceCacheToPriceList = (priceCache: PriceCache): PriceList =>
  Object.entries(priceCache).map(([assetId, [lastFetchTime, prices]]): [Cardano.AssetId, MaybeTokenPrice] => [
    assetId as Cardano.AssetId,
    {
      lastFetchTime,
      price: prices ? { priceInAda: prices[0], priceVariationPercentage24h: prices[1] } : undefined
    }
  ]);
const priceMapToCache = (priceMap: PriceMap): PriceCache =>
  [...priceMap.entries()].reduce((acc, [assetId, { lastFetchTime, price }]) => {
    acc[assetId] = price ? [lastFetchTime, [price.priceInAda, price.priceVariationPercentage24h]] : [lastFetchTime];
    return acc;
  }, {} as PriceCache);

const oldPrices$ = from(
  storage.local
    .get(CACHE_KEY)
    .catch((error) => {
      console.warn('Error getting cached cardano token prices', error);
    })
    .then((data) => ((data || {})[CACHE_KEY] as PriceCache) || {})
    .then(priceCacheToPriceList)
).pipe(shareReplay());

const tryStorePrices = (priceMap: PriceMap): void => {
  const priceCache = priceMapToCache(priceMap);
  void storage.local
    .set({ [CACHE_KEY]: priceCache })
    .catch((error) => console.warn('Error setting cached cardano token prices', error));
};

const fetchPrice = (assetId: Cardano.AssetId): Observable<PriceListItem> =>
  // TODO: replace with `fromFetch` (rxjs/fetch)
  from(
    (async (): Promise<PriceListItem> => {
      try {
        const url = `${process.env.TOKEN_PRICES_URL}/cardano/tokens/${assetId}/pools`;
        const response = await rateLimiter.schedule(() => fetch(url));
        if (response.status === 404) {
          return [assetId, { lastFetchTime: Date.now(), notFound: true }];
        }
        if (response.status === 429) {
          console.warn('Error fetching cardano token price', assetId, '(rate limit)');
          return [assetId, { lastFetchTime: Date.now() }];
        }
        const body = await response.json();
        const data = body.data?.[0]?.attributes;

        // If not the expected data, return no price
        if (typeof data === 'object') {
          const {
            base_token_price_native_currency: priceInAda,
            price_change_percentage: { h24: h24Change }
          } = data;

          // If not the expected data, return no price
          if (typeof priceInAda === 'string' && typeof h24Change === 'string') {
            return [
              assetId,
              {
                lastFetchTime: Date.now(),
                price: {
                  priceInAda: Number.parseFloat(priceInAda),
                  priceVariationPercentage24h: Number.parseFloat(h24Change)
                }
              }
            ];
          }
        }
      } catch (error) {
        console.warn('Error fetching cardano token price', assetId, error);
      }
      return [assetId, { lastFetchTime: Date.now() }];
    })()
  );

const fungibleTokenAssetIds = (wallet: ObservableWallet) =>
  combineLatest([wallet.balance.utxo.total$, wallet.assetInfo$]).pipe(
    mergeMap(([{ assets = new Map() }, assetInfoMap]) =>
      [...assets.keys()].filter((assetId) => !mayBeNFT(assetInfoMap.get(assetId)))
    )
  );

const lastKnownPrice = (assetId: Cardano.AssetId, knownPrices$: Observable<PriceMap>) =>
  knownPrices$.pipe(
    take(1),
    map((prices) => prices.get(assetId))
  );

const waitTilPriceUpdateIsDue =
  () =>
  // eslint-disable-next-line unicorn/consistent-function-scoping
  (knownPrice$: Observable<MaybeTokenPrice>): Observable<MaybeTokenPrice> =>
    knownPrice$.pipe(
      mergeMap((knownPrice) => {
        const lastFetchTime = knownPrice?.lastFetchTime || 0;
        // TODO: it would be good to have separate check interval for 'not found' prices
        // because it is unlikely that they would become available soon
        const nextFetchDueAt = lastFetchTime + TOKEN_PRICE_CHECK_INTERVAL;
        const now = Date.now();
        return nextFetchDueAt <= now ? of(knownPrice) : timer(nextFetchDueAt - now).pipe(map(() => knownPrice));
      })
    );

const trackTokenPrice = (assetId: Cardano.AssetId, knownPrices$: Observable<PriceMap>): Observable<PriceListItem> =>
  lastKnownPrice(assetId, knownPrices$).pipe(
    waitTilPriceUpdateIsDue(),
    mergeMap((knownPrice) =>
      fetchPrice(assetId).pipe(
        repeatWhen(() => timer(TOKEN_PRICE_CHECK_INTERVAL)),
        // do not retry 404s on interval; will try again when SW is restarted
        takeWhile(([, { notFound }]) => !notFound, true),
        // if we failed to fetch the price, only emit when
        // the price is not already in cache (1st failure only).
        // otherwise we lose the last known price
        filter(([, { price }]) => !!price || !knownPrice)
      )
    )
  );

const trackWalletAssetPrices = (
  wallet: ObservableWallet,
  knownPrices$: Observable<PriceMap>
): Observable<PriceListItem> =>
  fungibleTokenAssetIds(wallet).pipe(mergeMap((assetId) => trackTokenPrice(assetId, knownPrices$)));

const trackActiveWalletAssetPrices = (wallet$: Observable<ActiveWallet>, knownPrices$: Observable<PriceMap>) =>
  wallet$.pipe(
    switchMap((maybeActiveWallet) =>
      maybeActiveWallet?.props.chainId.networkId === Cardano.NetworkId.Mainnet
        ? trackWalletAssetPrices(maybeActiveWallet.observableWallet, knownPrices$)
        : EMPTY
    ),
    scan((priceMap, [assetId, maybeTokenPrice]) => {
      priceMap.set(assetId, maybeTokenPrice);
      return priceMap;
    }, new Map<Cardano.AssetId, MaybeTokenPrice>()),
    // batch emissions
    auditTime(TOKEN_PRICE_EMIT_THROTTLE_FREQUENCY),
    map((priceMap) => [...priceMap.entries()])
  );

export const initCardanoTokenPrices = (wallet$: Observable<ActiveWallet | null>): Observable<TokenPricesState> => {
  const knownPrices$ = new ReplaySubject<PriceMap>(1);
  return combineLatest([oldPrices$, trackActiveWalletAssetPrices(wallet$, knownPrices$).pipe(startWith([]))]).pipe(
    map(([oldPrices, updatedPrices]): TokenPricesState => {
      const tokens = new Map<Cardano.AssetId, MaybeTokenPrice>([...oldPrices, ...updatedPrices]);
      knownPrices$.next(tokens);
      if (updatedPrices.length > 0) {
        tryStorePrices(tokens);
      }
      return {
        // TODO: status and timestamp of token prices doesn't seem to be used
        // either implement and use it, or remove from TokenPricesState entirely
        status: 'idle',
        tokens
      };
    })
  );
};
