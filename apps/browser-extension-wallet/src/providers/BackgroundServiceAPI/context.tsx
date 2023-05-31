import { Shutdown } from '@cardano-sdk/util';
import { consumeRemoteApi } from '@cardano-sdk/web-extension';
import { backgroundServiceProperties } from '@lib/scripts/background/config';
import { BackgroundService, BaseChannels } from '@lib/scripts/types';
import React, { createContext, useContext } from 'react';
import { runtime } from 'webextension-polyfill';

export interface BackgroundServiceAPIProviderProps {
  children: React.ReactNode;
  value?: BackgroundService & Shutdown;
}

const backgroundServices = consumeRemoteApi<BackgroundService>(
  {
    baseChannel: BaseChannels.BACKGROUND_ACTIONS,
    properties: backgroundServiceProperties
  },
  { runtime, logger: console }
);

// eslint-disable-next-line unicorn/no-null
const BackgroundServiceAPIContext = createContext<typeof backgroundServices | null>(null);

export const useBackgroundServiceAPIContext = (): typeof backgroundServices => {
  const backgroundService = useContext(BackgroundServiceAPIContext);
  if (backgroundService === null) throw new Error('BackgroundServiceAPIContext not defined');
  return backgroundService;
};

export const BackgroundServiceAPIProvider = ({
  children,
  value = backgroundServices
}: BackgroundServiceAPIProviderProps): React.ReactElement => (
  <BackgroundServiceAPIContext.Provider value={value}>{children}</BackgroundServiceAPIContext.Provider>
);
