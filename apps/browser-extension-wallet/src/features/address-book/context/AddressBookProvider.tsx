/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-multi-comp */
import React, { useMemo } from 'react';
import { AddressBookContext } from './context';
import { addressBookQueries, AddressBookSchema, addressBookSchema, useDbState } from '@src/lib/storage';
import { useWalletStore } from '@src/stores';
import { Wallet } from '@lace/cardano';
import { toast, ToastProps } from '@lace/common';
import { hasAddressBookItem } from '@utils/validators';

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
  const { list, count, utils } = useDbState<AddressBookSchema, AddressRecordParams>(
    initialState,
    addressBookSchema,
    queries
  );

  const handleSaveAddress = async (record: AddressRecordParams, params: ToastProps) => {
    const [hasError, toastParams] = hasAddressBookItem(list, record);
    if (hasError) {
      toast.notify(toastParams);
      throw new Error(toastParams.text);
    }
    return utils.saveRecord(record, params);
  };

  return (
    <AddressBookContext.Provider value={{ list, count, utils: { ...utils, saveRecord: handleSaveAddress } }}>
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
