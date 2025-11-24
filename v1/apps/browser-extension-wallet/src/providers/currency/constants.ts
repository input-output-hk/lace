import { CurrencyInfo } from '../../types';

export enum currencyCode {
  USD = 'USD',
  AUD = 'AUD',
  BRL = 'BRL',
  CAD = 'CAD',
  EUR = 'EUR',
  INR = 'INR',
  JPY = 'JPY',
  KRW = 'KRW',
  CHF = 'CHF',
  GBP = 'GBP',
  VND = 'VND'
}

export const currencies: Record<currencyCode, string> = {
  [currencyCode.USD]: '$',
  [currencyCode.AUD]: 'A$',
  [currencyCode.BRL]: 'R$',
  [currencyCode.CAD]: 'C$',
  [currencyCode.EUR]: '€',
  [currencyCode.INR]: '₹',
  [currencyCode.JPY]: '￥',
  [currencyCode.KRW]: '₩',
  [currencyCode.CHF]: 'CHf',
  [currencyCode.GBP]: '£',
  [currencyCode.VND]: '₫'
};

export const currencyMap = new Map(Object.entries(currencies));

export const defaultCurrency: CurrencyInfo = {
  code: currencyCode.USD,
  symbol: currencies[currencyCode.USD]
};
