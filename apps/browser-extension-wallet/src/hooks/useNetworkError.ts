import { useEffect } from 'react';
import { useBackgroundServiceAPIContext } from '@providers';
import { Message, MessageTypes } from '@lib/scripts/types';
import { useWalletStore } from '@src/stores';
import { NetworkConnectionStates } from '@src/types';
import { useNetwork } from './useNetwork';

export const useNetworkError = (cb: () => void): void => {
  const { setNetworkConnection } = useWalletStore();
  const { isOnline } = useNetwork();
  const backgroundServices = useBackgroundServiceAPIContext();

  useEffect(() => {
    const subscription = backgroundServices.requestMessage$?.subscribe(({ type, data }: Message): void => {
      let isHTTPConnectionStable = true;
      let isWSConnectionStable = true;
      if (type === MessageTypes.HTTP_CONNECTION) {
        isHTTPConnectionStable = data.connected;
      } else if (type === MessageTypes.WS_CONNECTION) {
        isWSConnectionStable = data.connected;
      }

      if (!isHTTPConnectionStable || !isWSConnectionStable || !isOnline) {
        cb();
      }
      setNetworkConnection(
        isHTTPConnectionStable && isWSConnectionStable && isOnline
          ? NetworkConnectionStates.CONNNECTED
          : NetworkConnectionStates.OFFLINE
      );
    });
    return () => subscription.unsubscribe();
  }, [backgroundServices, setNetworkConnection, cb, isOnline]);
};
