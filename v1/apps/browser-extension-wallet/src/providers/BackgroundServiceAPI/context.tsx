import { Shutdown } from '@cardano-sdk/util';
import { consumeRemoteApi } from '@cardano-sdk/web-extension';
import { backgroundServiceProperties } from '@lib/scripts/background/config';
import { BackgroundService, BaseChannels } from '@lib/scripts/types';
import React, { createContext, useContext } from 'react';
import { runtime } from 'webextension-polyfill';
import { logger } from '@lace/common';

export interface BackgroundServiceAPIProviderProps {
  children: React.ReactNode;
  value?: BackgroundService & Shutdown;
}

const backgroundServices = consumeRemoteApi<BackgroundService>(
  {
    baseChannel: BaseChannels.BACKGROUND_ACTIONS,
    properties: backgroundServiceProperties
  },
  { runtime, logger }
);

const BackgroundServiceAPIContext = createContext<typeof backgroundServices>(backgroundServices);

export const useBackgroundServiceAPIContext = (): typeof backgroundServices => useContext(BackgroundServiceAPIContext);

export const BackgroundServiceAPIProvider = ({
  children,
  value = backgroundServices
}: BackgroundServiceAPIProviderProps): React.ReactElement => (
  <BackgroundServiceAPIContext.Provider value={value}>{children}</BackgroundServiceAPIContext.Provider>
);
