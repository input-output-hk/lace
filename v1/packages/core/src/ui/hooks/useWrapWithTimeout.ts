import { useCallback } from 'react';

const threeSecondsTimeout = 3000;
const timeoutErrorMessage = 'Timeout. Connecting too long.';

export const isTimeoutError = (error: Error): boolean => error.message === timeoutErrorMessage;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericAsyncFunction = (...params: any[]) => Promise<any>;

export const useWrapWithTimeout = <T extends GenericAsyncFunction>(fn: T): T =>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useCallback(
    (async (...params) => {
      const result = await Promise.race([
        fn(...params),
        new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), threeSecondsTimeout))
      ]);

      if (result === 'timeout') {
        throw new Error(timeoutErrorMessage);
      }

      return result;
    }) as T,
    [fn]
  );
