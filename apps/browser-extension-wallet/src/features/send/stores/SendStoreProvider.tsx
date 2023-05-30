import React from 'react';
import createContext from 'zustand/context';
import { SendStore } from './types';
import { createSendStore } from './createSendStore';

interface StoreProviderProps {
  children: React.ReactNode;
}

const { Provider, useStore } = createContext<SendStore>();

/**
 * hook to get send flow states
 */
export const useSendStore = useStore;

export const SendStoreProvider = ({ children }: StoreProviderProps): React.ReactElement => (
  <Provider createStore={createSendStore}>{children}</Provider>
);
