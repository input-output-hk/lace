import type { ModeApi } from '../types';

import {
  consumeRemoteApi,
  MinimalRuntime,
  RemoteApiProperties,
  RemoteApiPropertyType
} from '@cardano-sdk/web-extension';

const MODE_STORAGE_KEY = 'lace-features';
const logger = console;

export const WALLET_MODE_CHANNEL = 'wallet-mode';
export const modeApiProperties: RemoteApiProperties<ModeApi> = {
  getMode: RemoteApiPropertyType.MethodReturningPromise
};

const withModeApi = async <T>(invoke: (api: ModeApi) => Promise<T>, runtime: MinimalRuntime): Promise<T> => {
  const modeApi = consumeRemoteApi(
    {
      baseChannel: WALLET_MODE_CHANNEL,
      properties: modeApiProperties
    },
    {
      runtime,
      logger
    }
  );
  try {
    return await invoke(modeApi);
  } finally {
    modeApi.shutdown();
  }
};

const loadAndStoreFeatureMode = async (runtime: MinimalRuntime) =>
  withModeApi(async (modeApi) => {
    const featureMode = await modeApi.getMode();
    localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(featureMode));
    return featureMode;
  }, runtime);

/**
 * Get feature flags:
 * - if doesn't exist in local storage, get feature flags from service worker
 *   by using the specified runtime for messaging
 * - if exists in local storage
 *   - return stored feature flags
 *   - as a side effect, get feature flags from service worker by using the
 *     specified runtime for messaging and store them in local storage
 */
export const getMode = async (runtime: MinimalRuntime): Promise<'lace' | 'nami'> =>
  //   const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
  //   if (storedMode) {
  //     // update feature flags in local storage without blocking the return
  //     void loadAndStoreFeatureMode(runtime);
  //     return JSON.parse(storedMode) as WalletMode;
  //   }
  loadAndStoreFeatureMode(runtime);
