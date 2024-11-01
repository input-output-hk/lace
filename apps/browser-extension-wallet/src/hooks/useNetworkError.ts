import { useEffect } from 'react';
import { useBackgroundServiceAPIContext } from '@providers';
import { HTTPConnectionStatus, MessageTypes } from '@lib/scripts/types';
import { useWalletStore } from '@src/stores';
import { NetworkConnectionStates } from '@src/types';
import { useNetwork } from './useNetwork';

export const useNetworkError = (cb: () => void): void => {
  const { setNetworkConnection } = useWalletStore();
  const { isOnline } = useNetwork();
  const backgroundServices = useBackgroundServiceAPIContext();

  useEffect(() => {
    const subscription = backgroundServices.requestMessage$?.subscribe(({ type, data }): void => {
      let isNetworkInfoProviderConnected = true;
      if (type === MessageTypes.NETWORK_INFO_PROVIDER_CONNECTION) {
        isNetworkInfoProviderConnected = (data as HTTPConnectionStatus).connected;
      }
      if (!isNetworkInfoProviderConnected || !isOnline) {
        cb();
      }
      setNetworkConnection(
        isNetworkInfoProviderConnected && isOnline
          ? NetworkConnectionStates.CONNNECTED
          : NetworkConnectionStates.OFFLINE
      );
    });
    return () => subscription.unsubscribe();
  }, [backgroundServices, setNetworkConnection, cb, isOnline]);
};
