import { useCallback } from 'react';

export enum CurrencyCode {
  USD = 'USD',
  EUR = 'EUR',
}

export const useFiatCurrency = (
  fiatCurrency: string,
  setFiatCurrency: (currency: string) => void,
): {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
} => {
  return {
    currency:
      fiatCurrency in CurrencyCode
        ? CurrencyCode[fiatCurrency]
        : CurrencyCode.USD,
    setCurrency: useCallback(
      currency => {
        setFiatCurrency(CurrencyCode[currency]);
      },
      [setFiatCurrency],
    ),
  };
};
