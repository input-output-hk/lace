import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';

import { ExperimentName } from '@providers/AnalyticsProvider/analyticsTracker';

interface FeatureFlagsProviderProps {
  children: React.ReactNode;
  //   postHogClient: PostHogClient;
}

type FeatureFlags = {
  enabledFeature: Array<string>;
  flagsHaveBeenLoaded: boolean;
  isFeatureEnabled: (param: ExperimentName) => boolean;
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
  const [flagsHaveBeenLoaded, setFlagsHaveBeenLoaded] = useState(false);

  useEffect(() => {
    const subscription = analytics.getPostHogFeatureFlag((flags) => {
      setEnabledFeature(flags);
      setFlagsHaveBeenLoaded(true);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [analytics]);

  const isFeatureEnabled: FeatureFlags['isFeatureEnabled'] = (flag) =>
    flagsHaveBeenLoaded && enabledFeature.includes(flag);

  return (
    <FeatureFlagsContext.Provider value={{ enabledFeature, flagsHaveBeenLoaded, isFeatureEnabled }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};
