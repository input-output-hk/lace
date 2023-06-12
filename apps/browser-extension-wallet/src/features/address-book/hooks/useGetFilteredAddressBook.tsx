import { useDatabaseContext } from '@src/providers/DatabaseProvider';
import { useState, useCallback, useRef, useEffect } from 'react';
import { AddressBookSchema, addressBookSchema } from '@src/lib/storage';
import { useActionExecution } from '@src/hooks/useActionExecution';
import { useWalletStore } from '@src/stores';
import { cardanoNetworkMap } from '@src/features/address-book/context';

const DEFAULT_QUERY_LIMIT = 5;

interface GetAddressByNameOrAddressArgs {
  value: string;
  limit?: number;
}

interface FilteredAddressList {
  id: number;
  walletName: string;
  walletAddress: string;
}

const getAddressBookByNameOrAddressTransformer = (
  { address, name, id }: AddressBookSchema,
  networkName: string
): FilteredAddressList => ({
  walletAddress: address.replace(networkName.toUpperCase(), ''),
  walletName: name.replace(networkName.toUpperCase(), ''),
  id
});

export const useGetFilteredAddressBook = (): {
  filteredAddresses: FilteredAddressList[];
  getAddressBookByNameOrAddress: ({ value, limit }: GetAddressByNameOrAddressArgs) => Promise<void>;
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

  const getAddressBookByNameOrAddress = useCallback(
    async ({ value, limit = DEFAULT_QUERY_LIMIT }: GetAddressByNameOrAddressArgs) => {
      const network = cardanoNetworkMap[environmentName];

      if (value.length <= 0) {
        setFilteredAddresses([]);
      } else {
        await executeRef.current.execute(async () => {
          const result = await dbRef.current
            .getConnection<AddressBookSchema>(addressBookSchema)
            .where('name')
            .startsWithIgnoreCase(`${environmentName}${value}`)
            .or('address')
            .equalsIgnoreCase(`${environmentName}${value}`)
            .filter((item) => item.network === network)
            .limit(limit)
            .toArray();

          const addressList = result.map((element) =>
            getAddressBookByNameOrAddressTransformer(element, environmentName)
          );
          setFilteredAddresses(addressList);
        });
      }
    },
    [environmentName]
  );

  const resetAddressList = useCallback(() => {
    setFilteredAddresses([]);
  }, []);

  return { filteredAddresses, getAddressBookByNameOrAddress, resetAddressList };
};
