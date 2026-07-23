import { FeatureFlagKey } from '@lace-contract/feature';

import type { CurrencyPreference } from './types';

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

/**
 * Feature flag whose payload carries only a manual currency hide-list, so ops
 * can hide a currency without a release. It does not define the currency list
 * itself — that is `FIAT_CURRENCIES` below, gated by CoinGecko.
 */
export const SUPPORTED_CURRENCIES_FEATURE_FLAG = FeatureFlagKey(
  'SUPPORTED_CURRENCIES',
);

export type CurrencyChoiceFeatureFlagPayload = {
  /** Lowercase currency codes to hide even if CoinGecko still supports them. */
  currency_choice_exclusions?: string[];
};

/**
 * Static allowlist of fiat currencies the app can display, in display order.
 *
 * This is the source of *identity* (code + ticker + fiat-ness): CoinGecko's
 * `supported_vs_currencies` returns only lowercase codes with no ticker, name,
 * or fiat/crypto label, so non-fiat entries (crypto, metals) are excluded here
 * by construction. CoinGecko remains the source of *availability*: the
 * displayed list is this allowlist intersected with CoinGecko's supported list
 * (see `selectSupportedCurrencyPreferences`).
 *
 * The lowercase form of each `name` is used to match CoinGecko codes and the
 * `currency_choice_exclusions` flag payload.
 */
export const FIAT_CURRENCIES: readonly CurrencyPreference[] = [
  { name: 'USD', ticker: '$' },
  { name: 'EUR', ticker: '€' },
  { name: 'GBP', ticker: '£' },
  { name: 'JPY', ticker: '¥' },
  { name: 'CAD', ticker: 'C$' },
  { name: 'AUD', ticker: 'A$' },
  { name: 'CHF', ticker: 'CHF' },
  { name: 'BRL', ticker: 'R$' },
  { name: 'INR', ticker: '₹' },
  { name: 'KRW', ticker: '₩' },
  { name: 'VND', ticker: '₫' },
  { name: 'MXN', ticker: 'MXN' },
  { name: 'AED', ticker: 'AED' },
  { name: 'ARS', ticker: 'ARS' },
  { name: 'BDT', ticker: '৳' },
  { name: 'BHD', ticker: 'BHD' },
  { name: 'BMD', ticker: 'BMD' },
  { name: 'CLP', ticker: 'CLP' },
  { name: 'CNY', ticker: '¥' },
  { name: 'CZK', ticker: 'Kč' },
  { name: 'DKK', ticker: 'kr' },
  { name: 'GEL', ticker: '₾' },
  { name: 'HKD', ticker: 'HK$' },
  { name: 'HUF', ticker: 'Ft' },
  { name: 'IDR', ticker: 'Rp' },
  { name: 'ILS', ticker: '₪' },
  { name: 'KWD', ticker: 'KD' },
  { name: 'LKR', ticker: 'Rs' },
  { name: 'MMK', ticker: 'K' },
  { name: 'MYR', ticker: 'RM' },
  { name: 'NGN', ticker: '₦' },
  { name: 'NOK', ticker: 'kr' },
  { name: 'NZD', ticker: 'NZ$' },
  { name: 'PHP', ticker: '₱' },
  { name: 'PKR', ticker: '₨' },
  { name: 'PLN', ticker: 'zł' },
  { name: 'RUB', ticker: '₽' },
  { name: 'SAR', ticker: 'SR' },
  { name: 'SEK', ticker: 'kr' },
  { name: 'SGD', ticker: 'S$' },
  { name: 'THB', ticker: '฿' },
  { name: 'TRY', ticker: '₺' },
  { name: 'TWD', ticker: 'NT$' },
  { name: 'UAH', ticker: '₴' },
  { name: 'VES', ticker: 'Bs.S' },
  { name: 'ZAR', ticker: 'R' },
];
