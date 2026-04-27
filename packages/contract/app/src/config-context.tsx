import type { ReactElement } from 'react';

import React, { createContext, useMemo } from 'react';

import type { AppConfig, ViewId } from '@lace-contract/module';

type Config = {
  viewId: ViewId;
  appConfig?: AppConfig;
};

const configContext = createContext<Config | null>(null);

type ConfigProviderProps = Config & {
  children: ReactElement;
};

export const ConfigProvider = ({
  children,
  viewId,
  appConfig,
}: ConfigProviderProps) => {
  const config = useMemo(
    () => ({
      viewId,
      appConfig,
    }),
    [viewId, appConfig],
  );

  return (
    <configContext.Provider value={config}>{children}</configContext.Provider>
  );
};

export const useConfig = () => {
  const config = React.useContext(configContext);

  if (!config) {
    throw new Error(
      `${useConfig.name} called outside of ${ConfigProvider.name}`,
    );
  }

  return config;
};
