import type { ModeApi } from '../types';

import {
  consumeRemoteApi,
  MinimalRuntime,
  RemoteApiProperties,
  RemoteApiPropertyType
} from '@cardano-sdk/web-extension';

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

export const getMode = async (runtime: MinimalRuntime): Promise<'lace' | 'nami'> =>
  withModeApi(async (modeApi) => await modeApi.getMode(), runtime);
