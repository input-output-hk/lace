import create, { UseStore } from 'zustand';
import { Wallet } from '@lace/cardano';
import { currencyCode, currencyMap, defaultCurrency, currencies } from './constants';
import { CurrencyInfo } from '@src/types';
import { saveValueInLocalStorage } from '../../utils/local-storage';
import { ADASymbols, CARDANO_COIN_SYMBOL } from '@src/utils/constants';

export interface ICurrencyStore {
  fiatCurrency: CurrencyInfo;
  supportedCurrencies: CurrencyInfo[];
  setFiatCurrency: (code: currencyCode) => void;
}

export const getSupportedCurrencies = (): CurrencyInfo[] =>
  Object.entries(
    process.env.USE_MULTI_CURRENCY === 'true' ? currencies : { [currencyCode.USD]: currencies[currencyCode.USD] }
  )
    .map(
      ([code, symbol]: [currencyCode, string]): CurrencyInfo => ({
        code,
        symbol
      })
    )
    .sort((a, b) => a.code.localeCompare(b.code));

export const getCurrencyInfo = (code: currencyCode | ADASymbols, cardanoCoin?: Wallet.CoinId): CurrencyInfo => {
  if (process.env.USE_MULTI_CURRENCY !== 'true') {
    return defaultCurrency;
  }

  if (code === CARDANO_COIN_SYMBOL[Wallet.Cardano.NetworkId.Mainnet]) {
    return {
      code,
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
  currentFiatCurrency: currencyCode | ADASymbols | undefined,
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
