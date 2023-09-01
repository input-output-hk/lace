import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';

interface FeatureFlagsProviderProps {
  children: React.ReactNode;
}

type FeatureFlags = {
  flagsHaveBeenLoaded: boolean;
};

// eslint-disable-next-line unicorn/no-null
const FeatureFlagsContext = createContext<FeatureFlags | null>(null);

export const useFeatureFlagsContext = (): FeatureFlags => {
  const analyticsContext = useContext(FeatureFlagsContext);
  if (analyticsContext === null) throw new Error('context not defined');
  return analyticsContext;
};

// eslint-disable-next-line arrow-body-style
export const FeatureFlagsProvider = ({ children }: FeatureFlagsProviderProps): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const [flagsHaveBeenLoaded, setFlagsHaveBeenLoaded] = useState(false);

  useEffect(() => {
    const subscription = analytics.subscribeToFlagsLoadingProcess((loaded) => {
      setFlagsHaveBeenLoaded(loaded);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [analytics]);

  return <FeatureFlagsContext.Provider value={{ flagsHaveBeenLoaded }}>{children}</FeatureFlagsContext.Provider>;
};
