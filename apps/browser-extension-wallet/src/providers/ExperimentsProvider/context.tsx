import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { ExperimentName, ExperimentsConfigStatus } from './types';

type ExperimentsContext = {
  areExperimentsLoading: boolean;
  experimentVariantByKey: <R extends string>(key: ExperimentName) => R;
  overrideExperimentVariant: (flags: Record<string, string | boolean>) => void;
};

// eslint-disable-next-line unicorn/no-null
const ExperimentsContext = createContext<ExperimentsContext | null>(null);

export const useExperimentsContext = (): ExperimentsContext => {
  const postHogClientContext = useContext(ExperimentsContext);
  if (postHogClientContext === null) throw new Error('ExperimentsContext not defined');
  return postHogClientContext;
};

interface ExperimentsProviderProps {
  children: React.ReactNode;
}

export const ExperimentsProvider = ({ children }: ExperimentsProviderProps): React.ReactElement => {
  const postHogClient = usePostHogClientContext();
  const [experimentsConfigStatus, setExperimentsConfigStatus] = useState(ExperimentsConfigStatus.IDLE);

  const areExperimentsLoading = useMemo(
    () =>
      experimentsConfigStatus === ExperimentsConfigStatus.LOADING ||
      experimentsConfigStatus === ExperimentsConfigStatus.IDLE,
    [experimentsConfigStatus]
  );

  const experimentVariantByKey = useCallback(
    <R extends string>(key: ExperimentName): R => postHogClient.getExperimentVariant(key) as R,
    [postHogClient]
  );

  const overrideExperimentVariant = (flags: Record<string, string | boolean>) => {
    postHogClient.overrideFeatureFlags(flags);
  };

  useEffect(() => {
    const subscription = postHogClient?.subscribeToInitializationProcess((loaded) => {
      if (loaded) {
        setExperimentsConfigStatus(ExperimentsConfigStatus.LOADED);
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = postHogClient.subscribeToDistinctIdUpdate();
    return () => {
      if (subscription) subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ExperimentsContext.Provider value={{ areExperimentsLoading, experimentVariantByKey, overrideExperimentVariant }}>
      {children}
    </ExperimentsContext.Provider>
  );
};
