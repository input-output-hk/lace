export const COINGECKO_ENDPOINTS = {
  SIMPLE_PRICE: '/simple/price',
  COINS_LIST: '/coins/list',
  MARKET_CHART_RANGE: '/coins/:id/market_chart/range',
} as const;

// TODO: this needs to come from posthog
export const CURRENCY_MAP = {
  USD: 'usd',
  EUR: 'eur',
  GBP: 'gbp',
  JPY: 'jpy',
  AUD: 'aud',
  BRL: 'brl',
  CAD: 'cad',
  CHF: 'chf',
  INR: 'inr',
  KRW: 'krw',
  VND: 'vnd',
} as const;
