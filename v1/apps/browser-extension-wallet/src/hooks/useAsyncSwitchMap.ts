import { useCallback, useRef } from 'react';
import { logger } from '@lace/common';

const useAsyncSwitchMap = <TInput, TOutput>(
  mapper: (input: TInput) => Promise<TOutput>,
  callback: (output: TOutput) => void
): ((input: TInput) => void) => {
  const latestCallId = useRef(0);

  return useCallback(
    (input: TInput) => {
      const callId = ++latestCallId.current;

      (async () => {
        try {
          const output = await mapper(input);
          if (callId === latestCallId.current) {
            callback(output);
          }
        } catch (error) {
          logger.error('useAsyncSwitchMap: Failed to map the input', error);
        }
      })();
    },
    [mapper, callback]
  );
};

export { useAsyncSwitchMap };
