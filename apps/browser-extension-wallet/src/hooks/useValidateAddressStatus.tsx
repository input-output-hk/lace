import { useMemo } from 'react';
import { useHandleResolver } from './useHandleResolver';
import { useAddressBookContext } from '@src/features/address-book/context';
import { useUpdateAddressStatus } from './useUpdateAddressStatus';
import { AddressBookSchema } from '@lib/storage';

type AddressStatusProps = {
  expectedAddress: string;
  actualAddress: string;
};

export const useValidateAddressStatus = (address: string): AddressStatusProps => {
  const handleResolver = useHandleResolver();
  const { list: addressList } = useAddressBookContext();
  const validatedAddressStatus = useUpdateAddressStatus(addressList as AddressBookSchema[], handleResolver);

  const expectedAddress = useMemo(
    () => validatedAddressStatus[address]?.error?.expectedAddress ?? '',
    [validatedAddressStatus, address]
  );
  const actualAddress = useMemo(
    () => validatedAddressStatus[address]?.error?.actualAddress ?? '',
    [validatedAddressStatus, address]
  );

  return { expectedAddress, actualAddress };
};
