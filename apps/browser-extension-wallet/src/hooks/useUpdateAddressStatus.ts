import { KoraLabsHandleProvider } from '@cardano-sdk/cardano-services-client';
import { AddressBookSchema } from '@lib/storage';
import { CustomConflictError, hasHandleOwnerChanged } from '@src/utils/validators';
import { useEffect, useState } from 'react';

export const useUpdateAddressStatus = (
  addressList: unknown[],
  handleResolver: KoraLabsHandleProvider
): Record<string, { isValid: boolean; error?: CustomConflictError }> => {
  const [validatedAddressStatus, setValidatedAddressStatus] = useState<
    Record<string, { isValid: boolean; error?: CustomConflictError }>
  >({});

  useEffect(() => {
    const interval = 5000;

    const updateAddressStatus = (address: string, status: { isValid: boolean; error?: CustomConflictError }) => {
      setValidatedAddressStatus((currentValidatedAddressStatus) => ({
        ...currentValidatedAddressStatus,
        [address]: status
      }));
    };
    const validateAddresses = () => {
      addressList?.map(async (item: AddressBookSchema) => {
        hasHandleOwnerChanged({
          value: item.address,
          address: item.handleResolution?.cardanoAddress,
          handleResolver
        })
          .then(() => updateAddressStatus(item.address, { isValid: true }))
          .catch((error) => {
            if (error instanceof CustomConflictError) {
              updateAddressStatus(item.address, { isValid: false, error });
            }
          });
      });
    };
    validateAddresses();
    const intervalId = setInterval(validateAddresses, interval);

    return () => clearInterval(intervalId);
  }, [addressList, handleResolver]);

  return validatedAddressStatus;
};
