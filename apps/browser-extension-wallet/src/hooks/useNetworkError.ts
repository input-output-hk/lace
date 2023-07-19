import { useEffect } from 'react';
import { useBackgroundServiceAPIContext } from '@providers';
import { HTTPConnectionStatus, MessageTypes } from '@lib/scripts/types';
import { useWalletStore } from '@src/stores';
import { NetworkConnectionStates } from '@src/types';

export const useNetworkError = (cb: () => void): void => {
  const { setNetworkConnection } = useWalletStore();
  const backgroundServices = useBackgroundServiceAPIContext();

  useEffect(() => {
    const subscription = backgroundServices.requestMessage$?.subscribe(({ type, data }): void => {
      if (type === MessageTypes.HTTP_CONNECTION) {
        const isConnected = (data as HTTPConnectionStatus).connected;
        if (!isConnected) {
          cb();
        }
        setNetworkConnection(isConnected ? NetworkConnectionStates.CONNNECTED : NetworkConnectionStates.OFFLINE);
      }
    });
    return () => subscription.unsubscribe();
  }, [backgroundServices, setNetworkConnection, cb]);
};
