import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { ExperimentName, ExperimentsConfigStatus } from './types';

type ExperimentsContext = {
  areExperimentsLoading: boolean;
  getExperimentVariant: <R extends string>(key: ExperimentName) => Promise<R>;
  overrideExperimentVariant: (flags: Record<ExperimentName, string | boolean>) => void;
};

// eslint-disable-next-line unicorn/no-null
const ExperimentsContext = createContext<ExperimentsContext | null>(null);

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

  const getExperimentVariant = useCallback(
    async <R extends string>(key: ExperimentName): Promise<R> =>
      !areExperimentsLoading && ((await postHogClient.getExperimentVariant(key)) as R),
    [areExperimentsLoading, postHogClient]
  );

  const overrideExperimentVariant = (flags: Record<ExperimentName, string | boolean>) => {
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
  }, [postHogClient]);

  return (
    <ExperimentsContext.Provider value={{ areExperimentsLoading, getExperimentVariant, overrideExperimentVariant }}>
      {children}
    </ExperimentsContext.Provider>
  );
};
