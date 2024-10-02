import { useMemo } from 'react';

import { handleHttpProvider } from '@cardano-sdk/cardano-services-client';

import { HANDLE_SERVER_URLS } from './config';

import type { Cardano, HandleProvider } from '@cardano-sdk/core';

export const useHandleResolver = (
  networkMagic: Cardano.NetworkMagics,
): HandleProvider => {
  return useMemo(() => {
    const serverUrl = HANDLE_SERVER_URLS[networkMagic];
    return handleHttpProvider({
      baseUrl: serverUrl,
      logger: console,
    });
  }, [networkMagic]);
};
