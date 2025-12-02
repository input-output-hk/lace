import { HandleProvider, Cardano } from '@cardano-sdk/core';
import { AddressBookSchema } from '@lib/storage';
import { CustomConflictError, ensureHandleOwnerHasntChanged } from '@src/utils/validators';
import { useEffect, useState } from 'react';
import { createQueue } from '@src/utils/taskQueue';

type updateAddressStatusType = Record<string, { isValid: boolean; error?: CustomConflictError }>;

export const useUpdateAddressStatus = (
  addressList: AddressBookSchema[],
  handleResolver: HandleProvider
): updateAddressStatusType => {
  const [validatedAddressStatus, setValidatedAddressStatus] = useState<updateAddressStatusType>({});

  useEffect(() => {
    const queueInterval = 600_000; // 10 minutes
    const batchTasks = 4;
    const intervalBetweenBatch = 100;

    const queue = createQueue(batchTasks, intervalBetweenBatch);

    const updateAddressStatus = (address: string, status: { isValid: boolean; error?: CustomConflictError }) => {
      setValidatedAddressStatus((currentValidatedAddressStatus: updateAddressStatusType) => ({
        ...currentValidatedAddressStatus,
        [address]: status
      }));
    };

    const validateAddresses = async () => {
      if (!addressList) {
        return;
      }

      const handleList = addressList.filter((item) => !Cardano.isAddress(item.address));

      for (const item of handleList) {
        queue.enqueue(async () => {
          try {
            await ensureHandleOwnerHasntChanged({
              handleResolution: item.handleResolution,
              handleResolver
            });
            updateAddressStatus(item.address, { isValid: true });
          } catch (error) {
            if (error instanceof CustomConflictError || error.message === 'Handle not found') {
              updateAddressStatus(item.address, { isValid: false, error });
            }
          }
        });
      }
    };

    validateAddresses();
    const intervalId = setInterval(() => {
      queue.stop();
      validateAddresses();
    }, queueInterval);

    return () => {
      queue.stop();
      clearInterval(intervalId);
    };
  }, [addressList, handleResolver]);

  return validatedAddressStatus;
};
