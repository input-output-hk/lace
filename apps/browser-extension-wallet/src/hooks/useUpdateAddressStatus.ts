import { HandleProvider, Cardano } from '@cardano-sdk/core';
import { AddressBookSchema } from '@lib/storage';
import { CustomConflictError, ensureHandleOwnerHasntChanged } from '@src/utils/validators';
import { useEffect, useState } from 'react';

type updateAddressStatusType = Record<string, { isValid: boolean; error?: CustomConflictError }>;

const API_LIMIT = 4;
const API_RATE_LIMIT = 100;

type taskType = () => Promise<unknown>;

const createQueue = () => {
  let tasks: Array<taskType> = [];
  let isRunning = false;
  let sent = 0;

  const stop = () => {
    sent = 0;
    isRunning = false;
    tasks = [];
  };

  const isEmpty = () => tasks.length === 0;

  const dequeue = (): taskType | undefined => tasks.shift();

  const execute = async () => {
    if (!isEmpty()) {
      const task = dequeue();

      if (!task) {
        return;
      }

      await task();
      sent++;

      if (isRunning && !isEmpty()) {
        if (sent >= API_LIMIT) {
          // Reset the sent count
          sent = 0;
          // eslint-disable-next-line promise/avoid-new
          await new Promise((resolve) => setTimeout(resolve, API_RATE_LIMIT));
        }
        execute();
      }

      if (isEmpty()) {
        stop();
      }
    }
  };

  const enqueue = async (item: taskType) => {
    tasks.push(item);

    if (!isRunning) {
      isRunning = true;
      execute();
    }
  };

  return {
    enqueue,
    dequeue,
    isEmpty,
    stop
  };
};
export const useUpdateAddressStatus = (
  addressList: AddressBookSchema[],
  handleResolver: HandleProvider
): updateAddressStatusType => {
  const [validatedAddressStatus, setValidatedAddressStatus] = useState<updateAddressStatusType>({});

  useEffect(() => {
    const interval = 10_000;
    const queue = createQueue();

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
    }, interval);

    return () => {
      queue.stop();
      clearInterval(intervalId);
    };
  }, [addressList, handleResolver]);

  return validatedAddressStatus;
};
