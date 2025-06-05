/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { BehaviorSubject } from 'rxjs';
import { storage } from 'webextension-polyfill';
import { TokenPrices, Status } from '../../types';
import { Wallet } from '@lace/cardano';
import { Cardano } from '@cardano-sdk/core';
import { config } from '@src/config';
import Bottleneck from 'bottleneck';

/** The subset of token data from CoinGecko relevant for Lace to show token prices. */
type PriceData = [priceInAda: number, priceVariationPercentage24h: number];

/** The structure to store token data and when given data for a token was fetched optimized to have the thinnest size once stringified. */
type FetchedPriceData = [lastFetchTime: number] | [lastFetchTime: number, priceData: PriceData];

const CACHE_KEY = 'cardano-token-prices';
const { TOKEN_PRICE_CHECK_INTERVAL } = config();

const rateLimiter = new Bottleneck({
  reservoir: 10,
  reservoirIncreaseAmount: 5,
  reservoirIncreaseInterval: 1000,
  reservoirIncreaseMaximum: 10
});

/**
 * Given the total amount of token prices data is quite small, rather than fetching it from cache every time it is required,
 * the entire data is cached in RAM by `priceData` to make read accesses as cheap as possible.
 *
 * Write accesses are centralized through `updatePriceData` to ensure data consistency.
 */
let priceData: Record<string, FetchedPriceData>;

const tokenPrices$ = new BehaviorSubject<{ tokens: TokenPrices } & Status>({
  tokens: new Map(),
  status: 'idle'
});

const emitPrices = () =>
  tokenPrices$.next({
    status: 'fetched',
    tokens: new Map(
      Object.entries(priceData)
        .filter(([, data]) => data)
        .map(([assetId, [lastFetchTime, data]]) => {
          const asset = assetId as Wallet.Cardano.AssetId;

          if (!data) return [asset, { lastFetchTime }];

          const [priceInAda, priceVariationPercentage24h] = data;

          return [asset, { lastFetchTime, price: { priceInAda, priceVariationPercentage24h } }];
        })
    )
  });

const updatePriceData = (assetId: string, data?: PriceData) => {
  const now = Date.now();

  priceData[assetId] = data ? [now, data] : [now];
  emitPrices();
  storage.local
    .set({ [CACHE_KEY]: priceData })
    .catch((error) => console.error('Error setting cached cardano token prices', error));
};

const fetchPrice = async (assetId: Cardano.AssetId) => {
  const [lastFetchTime, cachedData] = priceData[assetId] || [0];

  // If recently fetched, do nothing
  if (lastFetchTime > Date.now() - TOKEN_PRICE_CHECK_INTERVAL) return;

  // Immediately set the lastFetchTime to avoid other events fetching the same token price to actually perform the request
  updatePriceData(assetId, cachedData);

  try {
    const url = `${process.env.TOKEN_PRICES_URL}/cardano/tokens/${assetId}/pools`;
    const response = await rateLimiter.schedule(() => fetch(url));
    const body = await response.json();
    const data = body.data?.[0]?.attributes;

    // If not the expected data, do nothing
    if (typeof data !== 'object') return;

    const {
      base_token_price_native_currency: priceInAda,
      price_change_percentage: { h24: h24Change }
    } = data;

    // If not the expected data, do nothing
    if (typeof priceInAda !== 'string' || typeof h24Change !== 'string') return;

    updatePriceData(assetId, [Number.parseFloat(priceInAda), Number.parseFloat(h24Change)]);
  } catch (error) {
    console.error('Error fetching cardano token price', assetId, error);
  }
};

const fetchPrices = async () => {
  for (const assetId in priceData) await fetchPrice(assetId as Cardano.AssetId);

  setTimeout(fetchPrices, TOKEN_PRICE_CHECK_INTERVAL);
};

export const initCardanoTokenPrices = () => {
  storage.local
    .get(CACHE_KEY)
    .then((data) => {
      priceData = data[CACHE_KEY] || {};

      emitPrices();
      fetchPrices();
    })
    .catch((error) => {
      console.error('Error getting cached cardano token prices', error);
      tokenPrices$.next({ tokens: new Map(), status: 'error' });
    });

  return tokenPrices$;
};

export const trackCardanoTokenPrice = async (assetId: Cardano.AssetId) => {
  // If init not yet completed, do nothing
  if (!priceData) return;

  fetchPrice(assetId);
};
