import { useEffect, useState } from 'react';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';

type NetworkStatus = {
  isOnline: boolean;
  isBackendFailing: boolean;
};

const MAX_BACKEND_FAILURES = 3;

export const useNetwork = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const { backendFailures$ } = useBackgroundServiceAPIContext();
  const [isBackendFailing, setIsbackendFailing] = useState(false);

  useEffect(() => {
    const sub = backendFailures$?.subscribe((numFailures) => {
      if (numFailures > MAX_BACKEND_FAILURES) {
        setIsbackendFailing(true);
      } else {
        setIsbackendFailing(false);
      }
    });
    return () => sub.unsubscribe();
  }, [backendFailures$]);

  const updateNetwork = () => {
    setIsOnline(window.navigator.onLine);
  };

  useEffect(() => {
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);

    return () => {
      window.removeEventListener('offline', updateNetwork);
      window.removeEventListener('online', updateNetwork);
    };
  }, [isOnline]);

  return { isOnline, isBackendFailing };
};
