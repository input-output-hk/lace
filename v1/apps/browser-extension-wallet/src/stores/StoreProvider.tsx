import React from 'react';
import createContext from 'zustand/context';
import { UseStore } from 'zustand';
import { WalletStore } from './types';
import { createWalletStore } from './createWalletStore';
import { useAppSettingsContext } from '@providers';
import { config } from '@src/config';
import { AppMode } from '@src/utils/constants';

const { CHAIN } = config();

interface StoreProviderProps {
  children: React.ReactNode;
  store?: UseStore<WalletStore>;
  appMode: AppMode;
  sliceProvider?: typeof createWalletStore;
}

type PrivateStates = '';
type WalletStoreInterface = Omit<WalletStore, PrivateStates>;

const { Provider, useStore } = createContext<WalletStoreInterface>();

/**
 * hook to gets wallet global states
 */
export const useWalletStore = useStore;

// This way the store can receive the wallet provider methods and the stored wallet info
export const StoreProvider = ({
  children,
  store,
  appMode,
  sliceProvider = createWalletStore
}: StoreProviderProps): React.ReactElement => {
  const [{ chainName = CHAIN }] = useAppSettingsContext();
  const createStore = () => store ?? sliceProvider(chainName, appMode);

  return <Provider createStore={createStore}>{children}</Provider>;
};
