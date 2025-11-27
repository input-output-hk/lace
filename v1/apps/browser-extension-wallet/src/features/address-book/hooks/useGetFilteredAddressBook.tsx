import { useDatabaseContext } from '@src/providers/DatabaseProvider';
import { useState, useCallback, useRef, useEffect } from 'react';
import { HandleResolution } from '@cardano-sdk/core';
import { AddressBookSchema, addressBookSchema } from '@src/lib/storage';
import { useActionExecution } from '@src/hooks/useActionExecution';
import { useWalletStore } from '@src/stores';
import { cardanoNetworkMap } from '@src/features/address-book/context';

const DEFAULT_QUERY_LIMIT = 5;

interface FilterAddressByNameOrAddressArgs {
  value: string;
  limit?: number;
}

interface FilteredAddressList {
  id: number;
  walletName: string;
  walletAddress: string;
  walletHandleResolution?: HandleResolution;
}

const addressTransformer = ({ address, name, id, handleResolution }: AddressBookSchema): FilteredAddressList => ({
  walletAddress: address,
  walletName: name,
  id,
  walletHandleResolution: handleResolution
});

export const useGetFilteredAddressBook = (): {
  filteredAddresses: FilteredAddressList[];
  filterAddressesByNameOrAddress: ({ value, limit }: FilterAddressByNameOrAddressArgs) => Promise<void>;
  getMatchedAddresses: ({ value, limit }: FilterAddressByNameOrAddressArgs) => Promise<FilteredAddressList[]>;
  resetAddressList: () => void;
} => {
  const { environmentName } = useWalletStore();
  const [db] = useDatabaseContext();
  const [execute] = useActionExecution();
  const [filteredAddresses, setFilteredAddresses] = useState<FilteredAddressList[]>([]);
  const dbRef = useRef(db);
  const executeRef = useRef({ execute });

  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  useEffect(() => {
    executeRef.current = { execute };
  }, [execute]);

  const getMatchedAddresses = useCallback(
    async ({
      value,
      limit = DEFAULT_QUERY_LIMIT
    }: FilterAddressByNameOrAddressArgs): Promise<FilteredAddressList[]> => {
      const network = cardanoNetworkMap[environmentName];

      if (!value) {
        return [];
      }

      const result = await dbRef.current
        .getConnection<AddressBookSchema>(addressBookSchema)
        .where('name')
        .startsWithIgnoreCase(value)
        .or('address')
        .equalsIgnoreCase(value)
        .filter((item) => item.network === network)
        .limit(limit)
        .toArray();

      return result.map((element) => addressTransformer(element));
    },
    [environmentName]
  );

  const filterAddressesByNameOrAddress = useCallback(
    async (args: FilterAddressByNameOrAddressArgs) => {
      await executeRef.current.execute(async () => {
        const addressList = await getMatchedAddresses(args);
        setFilteredAddresses(addressList);
      });
    },
    [getMatchedAddresses]
  );

  const resetAddressList = useCallback(() => {
    setFilteredAddresses([]);
  }, []);

  return { filteredAddresses, getMatchedAddresses, filterAddressesByNameOrAddress, resetAddressList };
};
