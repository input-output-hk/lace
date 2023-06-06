/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-multi-comp */
import React, { useMemo } from 'react';
import { AddressBookContext } from './context';
import { addressBookQueries, AddressBookSchema, addressBookSchema, useDbState } from '@src/lib/storage';
import { useWalletStore } from '@src/stores';
import { Wallet } from '@lace/cardano';

interface AddressBookProviderProps {
  children: React.ReactNode;
  initialState?: Array<AddressBookSchema>;
}

export type AddressRecordParams = Pick<AddressBookSchema, 'address' | 'name'>;

export const cardanoNetworkMap = {
  Mainnet: Wallet.Cardano.NetworkMagics.Mainnet,
  Preprod: Wallet.Cardano.NetworkMagics.Preprod,
  Preview: Wallet.Cardano.NetworkMagics.Preview,
  LegacyTestnet: Wallet.Cardano.NetworkMagics.Testnet
};

export const AddressBookProvider = ({ children, initialState }: AddressBookProviderProps): React.ReactElement => {
  const { environmentName } = useWalletStore();
  const queries = useMemo(() => addressBookQueries(cardanoNetworkMap[environmentName]), [environmentName]);

  return (
    <AddressBookContext.Provider
      value={useDbState<AddressBookSchema, AddressRecordParams>(initialState, addressBookSchema, queries)}
    >
      {children}
    </AddressBookContext.Provider>
  );
};

type WithAddressBookContext = <TProps>(
  element: React.JSXElementConstructor<TProps>,
  initialState?: Array<AddressBookSchema>
) => (props?: TProps) => React.ReactElement;

export const withAddressBookContext: WithAddressBookContext = (Component, initialState) => (props) =>
  (
    <AddressBookProvider initialState={initialState}>
      <Component {...props} />
    </AddressBookProvider>
  );
