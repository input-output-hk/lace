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

export const AddressBookProvider = ({ children, initialState }: AddressBookProviderProps): React.ReactElement => {
  const { environmentName } = useWalletStore();
  const queries = useMemo(
    () =>
      addressBookQueries(
        environmentName === 'Mainnet' ? Wallet.Cardano.NetworkId.Mainnet : Wallet.Cardano.NetworkId.Testnet
      ),
    [environmentName]
  );

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
