import type { LaceFeaturesApi, WalletMode } from '../types';

import {
  consumeRemoteApi,
  MinimalRuntime,
  RemoteApiProperties,
  RemoteApiPropertyType
} from '@cardano-sdk/web-extension';
import { logger } from '@lace/common';

const WALLET_MODE_STORAGE_KEY = 'lace-wallet-mode';

export const LACE_FEATURES_CHANNEL = 'lace-features';
export const laceFeaturesApiProperties: RemoteApiProperties<LaceFeaturesApi> = {
  getMode: RemoteApiPropertyType.MethodReturningPromise
};

const withLaceFeaturesApi = async <T>(
  invoke: (api: LaceFeaturesApi) => Promise<T>,
  runtime: MinimalRuntime
): Promise<T> => {
  const modeApi = consumeRemoteApi(
    {
      baseChannel: LACE_FEATURES_CHANNEL,
      properties: laceFeaturesApiProperties
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

type WalletModeResult =
  | { cachedWalletMode: WalletMode; latestWalletMode: Promise<WalletMode> }
  | { latestWalletMode: Promise<WalletMode> };

export const isCachedWalletModeResult = (
  result: WalletModeResult
): result is { cachedWalletMode: WalletMode; latestWalletMode: Promise<WalletMode> } => 'cachedWalletMode' in result;

const loadAndStoreWalletMode = async (runtime: MinimalRuntime) =>
  withLaceFeaturesApi(async (laceFeaturesApi) => {
    const laceMode = await laceFeaturesApi.getMode();
    localStorage.setItem(WALLET_MODE_STORAGE_KEY, JSON.stringify(laceMode));
    return laceMode;
  }, runtime);

export const getWalletMode = (runtime: MinimalRuntime): WalletModeResult => {
  const cachedWalletMode = localStorage.getItem(WALLET_MODE_STORAGE_KEY);
  return {
    ...(cachedWalletMode && { cachedWalletMode: JSON.parse(cachedWalletMode) }),
    latestWalletMode: loadAndStoreWalletMode(runtime)
  };
};
