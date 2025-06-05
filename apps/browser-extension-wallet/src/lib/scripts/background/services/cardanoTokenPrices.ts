/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {
  map,
  from,
  combineLatest,
  Observable,
  Subject,
  startWith,
  groupBy,
  mergeMap,
  throttleTime,
  exhaustMap,
  scan,
  auditTime,
  tap
} from 'rxjs';
import { storage } from 'webextension-polyfill';
import { TokenPrices, Status, MaybeTokenPrice } from '../../types';
import { Cardano, Milliseconds } from '@cardano-sdk/core';
import { TrackerSubject } from '@cardano-sdk/util-rxjs';
import { config } from '@src/config';
import Bottleneck from 'bottleneck';

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

const CACHE_KEY = 'cardano-token-prices';
const { TOKEN_PRICE_CHECK_INTERVAL } = config();
// eslint-disable-next-line no-magic-numbers, new-cap
const TOKEN_PRICE_EMIT_THROTTLE_FREQUENCY = Milliseconds(1000);

const rateLimiter = new Bottleneck({
  reservoir: 5,
  reservoirIncreaseAmount: 2,
  reservoirIncreaseInterval: 1000,
  reservoirIncreaseMaximum: 5
});

const priceCacheToPriceList = (priceCache: PriceCache): PriceList =>
  Object.entries(priceCache).map(([assetId, [lastFetchTime, prices]]): [Cardano.AssetId, MaybeTokenPrice] => [
    assetId as Cardano.AssetId,
    {
      lastFetchTime,
      price: prices ? { priceInAda: prices[0], priceVariationPercentage24h: prices[1] } : undefined
    }
  ]);
const priceListToCache = (priceList: PriceList): PriceCache =>
  priceList.reduce((acc, [assetId, { lastFetchTime, price }]) => {
    acc[assetId] = price ? [lastFetchTime, [price.priceInAda, price.priceVariationPercentage24h]] : [lastFetchTime];
    return acc;
  }, {} as PriceCache);

const trackRequest$ = new Subject<Cardano.AssetId>();
const oldPrices$ = from(
  storage.local
    .get(CACHE_KEY)
    .catch((error) => {
      console.warn('Error getting cached cardano token prices', error);
    })
    .then((data) => ((data || {})[CACHE_KEY] as PriceCache) || {})
    .then(priceCacheToPriceList)
);

const tryStorePrices = (priceList: PriceList): void => {
  const priceCache = priceListToCache(priceList);
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
        console.error('Error fetching cardano token price', assetId, error);
      }
      return [assetId, { lastFetchTime: Date.now() }];
    })()
  );

const updatedPrices$: Observable<PriceList> = trackRequest$.pipe(
  groupBy((assetId) => assetId),
  mergeMap((group$) =>
    group$.pipe(
      // if UI happens to spam requests, do not attempt to fetch this asset until last fetch completes
      throttleTime(TOKEN_PRICE_CHECK_INTERVAL, undefined, { leading: true, trailing: true }),
      exhaustMap(fetchPrice)
    )
  ),
  scan((priceMap, [assetId, maybeTokenPrice]) => {
    priceMap.set(assetId, maybeTokenPrice);
    return priceMap;
  }, new Map<Cardano.AssetId, MaybeTokenPrice>()),
  // batch emissions
  auditTime(TOKEN_PRICE_EMIT_THROTTLE_FREQUENCY),
  map((priceMap) => [...priceMap.entries()]),
  tap(tryStorePrices)
);

const tokenPrices$ = new TrackerSubject<TokenPricesState>(
  combineLatest([oldPrices$, updatedPrices$.pipe(startWith([]))]).pipe(
    map(
      ([oldPrices, updatedPrices]): TokenPricesState => ({
        // TODO: status and timestamp of token prices doesn't seem to be used
        // either implement and use it, or remove from TokenPricesState entirely
        status: 'idle',
        tokens: new Map([...oldPrices, ...updatedPrices])
      })
    )
  )
);

export const initCardanoTokenPrices = (): Observable<TokenPricesState> => tokenPrices$;
export const trackCardanoTokenPrice = async (assetId: Cardano.AssetId) => trackRequest$.next(assetId);
