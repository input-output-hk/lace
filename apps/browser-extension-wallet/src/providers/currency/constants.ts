import { CurrencyInfo } from '../../types';

export enum currencyCode {
  usd = 'USD',
  aud = 'AUD',
  brl = 'BRL',
  cad = 'CAD',
  eur = 'EUR',
  inr = 'INR',
  jpy = 'JPY',
  krw = 'KRW',
  chf = 'CHF',
  gbp = 'GBP',
  vnd = 'VND'
}

export const currencies: Record<currencyCode, string> = {
  [currencyCode.usd]: '$',
  [currencyCode.aud]: 'A$',
  [currencyCode.brl]: 'R$',
  [currencyCode.cad]: 'C$',
  [currencyCode.eur]: '€',
  [currencyCode.inr]: '₹',
  [currencyCode.jpy]: '￥',
  [currencyCode.krw]: '₩',
  [currencyCode.chf]: 'CHf',
  [currencyCode.gbp]: '£',
  [currencyCode.vnd]: '₫'
};

export const currencyMap = new Map(Object.entries(currencies));

export const defaultCurrency: CurrencyInfo = {
  code: currencyCode.usd,
  symbol: currencies[currencyCode.usd]
};
