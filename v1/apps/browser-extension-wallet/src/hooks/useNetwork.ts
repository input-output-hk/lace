import { useEffect, useState } from 'react';

type NetworkStatus = {
  isOnline: boolean;
};

export const useNetwork = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);

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

  return { isOnline };
};
