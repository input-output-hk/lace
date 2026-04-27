export const FEATURE_FLAG_TOKEN_PRICING = 'TOKEN_PRICING';

/**
 * Token prices are only available on mainnet.
 */
export const TOKEN_PRICING_NETWORK_TYPE = 'mainnet';

export const POLLING_INTERVAL_MS = 60000; // 60 seconds
export const PRICE_TTL = 5 * 60 * 1000; // 5 minutes
export const PRICE_HISTORY_TTL = 60 * 60 * 1000; // 1 hour

export const DEFAULT_CURRENCY = 'USD';

export const DEFAULT_CURRENCY_PREFERENCE = {
  name: 'USD',
  ticker: '$',
} as const;
