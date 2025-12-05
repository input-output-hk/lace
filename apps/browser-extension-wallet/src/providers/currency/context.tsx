import React from 'react';
import { ICurrencyStore, createCurrencyStore, getCurrencyInfo } from './store';

import { currencyCode } from './constants';
import createContext from 'zustand/context';
import { getValueFromLocalStorage } from '@src/utils/local-storage';
import { useWalletStore } from '@src/stores';

interface ICurrencyStoreProvider {
  children: React.ReactNode;
}

const { Provider, useStore } = createContext<ICurrencyStore>();

export const CurrencyStoreProvider = ({ children }: ICurrencyStoreProvider): React.ReactElement => {
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const currency = getValueFromLocalStorage('currency', getCurrencyInfo(currencyCode.USD));
  const createStore = () => createCurrencyStore(currency.code, cardanoCoin);
  return <Provider createStore={createStore}>{children}</Provider>;
};

export const useCurrencyStore = useStore;
