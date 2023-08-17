import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';

interface FeatureFlagsProviderProps {
  children: React.ReactNode;
  //   postHogClient: PostHogClient;
}

type FeatureFlags = {
  enabledFeature: Array<string>;
  flagsHavdBeenLoaded: boolean;
  isFeatureEnabled: (param: 'assets' | 'nfts') => boolean;
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
  const [enabledFeature, setEnabledFeature] = useState<Array<string>>();
  const [flagsHavdBeenLoaded, setFlagsHavdBeenLoaded] = useState(false);

  useEffect(() => {
    const subscription = analytics.getPostHogFeatureFlag((flags) => {
      setEnabledFeature(flags);
      setFlagsHavdBeenLoaded(true);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [analytics]);

  const isFeatureEnabled: FeatureFlags['isFeatureEnabled'] = (flag) =>
    flagsHavdBeenLoaded && enabledFeature.includes(flag);

  return (
    <FeatureFlagsContext.Provider value={{ enabledFeature, flagsHavdBeenLoaded, isFeatureEnabled }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};
