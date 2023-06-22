import create, { UseStore } from 'zustand';
import { Wallet } from '@lace/cardano';
import { currencyCode, currencyMap, defaultCurrency, currencies } from './constants';
import { CurrencyInfo } from '../../types';
import { saveValueInLocalStorage } from '../../utils/local-storage';
import { CARDANO_COIN_SYMBOL } from '@src/utils/constants';

export interface ICurrencyStore {
  fiatCurrency: CurrencyInfo;
  supportedCurrencies: CurrencyInfo[];
  setFiatCurrency: (code: currencyCode) => void;
}

export const getSupportedCurrencies = (): CurrencyInfo[] =>
  Object.entries(
    process.env.USE_MULTI_CURRENCY === 'true' ? currencies : { [currencyCode.usd]: currencies[currencyCode.usd] }
  )
    .map(([code, symbol]) => ({
      code,
      symbol
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

export const getCurrencyInfo = (code: string, cardanoCoin?: Wallet.CoinId): CurrencyInfo => {
  if (process.env.USE_MULTI_CURRENCY !== 'true') {
    return defaultCurrency;
  }

  if (code === CARDANO_COIN_SYMBOL[Wallet.Cardano.NetworkId.Mainnet]) {
    return {
      code: code as currencyCode,
      symbol: cardanoCoin.symbol
    };
  }

  if (!currencyMap.has(code)) {
    return defaultCurrency;
  }

  return {
    code: code as currencyCode,
    symbol: currencyMap.get(code)
  };
};

export const createCurrencyStore = (
  currentFiatCurrency: string | undefined,
  cardanoCoin: Wallet.CoinId
): UseStore<ICurrencyStore> =>
  create<ICurrencyStore>((set) => ({
    supportedCurrencies: getSupportedCurrencies(),
    fiatCurrency: getCurrencyInfo(currentFiatCurrency, cardanoCoin),
    setFiatCurrency: (code: currencyCode) => {
      const currencyInfo = getCurrencyInfo(code, cardanoCoin);
      saveValueInLocalStorage({ key: 'currency', value: currencyInfo });
      set({ fiatCurrency: currencyInfo });
    }
  }));
