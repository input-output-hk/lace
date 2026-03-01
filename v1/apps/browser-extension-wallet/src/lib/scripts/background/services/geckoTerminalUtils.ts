import { Cardano } from '@cardano-sdk/core';
import { TokenPrice } from '../../types';

/** Shape of a pool entry from the GeckoTerminal /tokens/{id}/pools response. */
export interface GeckoTerminalPool {
  attributes?: {
    /* eslint-disable camelcase */
    base_token_price_native_currency?: string;
    quote_token_price_native_currency?: string;
    price_change_percentage?: { h24?: string };
    /* eslint-enable camelcase */
  };
  relationships?: {
    /* eslint-disable camelcase */
    base_token?: { data?: { id?: string } };
    /* eslint-enable camelcase */
  };
}

const CHAIN_PREFIX = 'cardano_';

/** Strips the chain prefix (e.g. "cardano_") and checks for an exact match. */
const normalizeAndMatch = (baseTokenId: string, assetId: Cardano.AssetId): boolean => {
  const normalized = baseTokenId.startsWith(CHAIN_PREFIX) ? baseTokenId.slice(CHAIN_PREFIX.length) : baseTokenId;
  return normalized === assetId;
};

/**
 * Extracts the token price from a GeckoTerminal pool response.
 * The pool may have the queried token as either the base or quote token,
 * so we check the relationship to pick the correct price field.
 */
export const extractTokenPriceFromPool = (
  pool: GeckoTerminalPool | undefined | null,
  assetId: Cardano.AssetId
): TokenPrice | undefined => {
  const data = pool?.attributes;
  // eslint-disable-next-line camelcase
  const baseTokenId = pool?.relationships?.base_token?.data?.id;
  const isBaseToken = typeof baseTokenId === 'string' && normalizeAndMatch(baseTokenId, assetId);

  const tokenPriceNativeCurrency = isBaseToken
    ? data?.base_token_price_native_currency
    : data?.quote_token_price_native_currency;
  const rawPrice = typeof baseTokenId === 'string' ? tokenPriceNativeCurrency : undefined;
  const h24Change = typeof baseTokenId === 'string' ? data?.price_change_percentage?.h24 : undefined;
  const priceInAda = typeof rawPrice === 'string' ? Number.parseFloat(rawPrice) : Number.NaN;
  const priceVariationPercentage24h = typeof h24Change === 'string' ? Number.parseFloat(h24Change) : Number.NaN;

  return Number.isFinite(priceInAda) && Number.isFinite(priceVariationPercentage24h)
    ? { priceInAda, priceVariationPercentage24h }
    : undefined;
};
