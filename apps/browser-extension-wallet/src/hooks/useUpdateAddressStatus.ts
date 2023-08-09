import { HandleProvider, Cardano } from '@cardano-sdk/core';
import { AddressBookSchema } from '@lib/storage';
import { CustomConflictError, ensureHandleOwnerHasntChanged } from '@src/utils/validators';
import { useEffect, useState } from 'react';

type updateAddressStatusType = Record<string, { isValid: boolean; error?: CustomConflictError }>;

const API_LIMIT = 5;
const API_RATE_LIMIT = 1000;

export const useUpdateAddressStatus = (
  addressList: AddressBookSchema[],
  handleResolver: HandleProvider
): updateAddressStatusType => {
  const [validatedAddressStatus, setValidatedAddressStatus] = useState<updateAddressStatusType>({});

  useEffect(() => {
    const interval = 10_000;

    const updateAddressStatus = (address: string, status: { isValid: boolean; error?: CustomConflictError }) => {
      setValidatedAddressStatus((currentValidatedAddressStatus) => ({
        ...currentValidatedAddressStatus,
        [address]: status
      }));
    };
    const validateAddresses = async () => {
      if (!addressList) {
        return;
      }

      const handleList = addressList.filter((item) => !Cardano.isAddress(item.address));

      for (const [i, item] of handleList?.entries()) {
        try {
          await ensureHandleOwnerHasntChanged({
            handleResolution: item.handleResolution,
            handleResolver
          });
          updateAddressStatus(item.address, { isValid: true });
        } catch (error) {
          if (error instanceof CustomConflictError) {
            updateAddressStatus(item.address, { isValid: false, error });
          }
        }

        if ((i + 1) % API_LIMIT === 0) {
          // This pauses the execution of the for loop so we don't get rate limited.
          // eslint-disable-next-line promise/avoid-new
          await new Promise((resolve) => setTimeout(resolve, API_RATE_LIMIT));
        }
      }
    };
    validateAddresses();
    const intervalId = setInterval(validateAddresses, interval);

    return () => clearInterval(intervalId);
  }, [addressList, handleResolver]);

  return validatedAddressStatus;
};
