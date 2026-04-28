import { FEATURE_FLAGS_CHANNEL } from '@lace-contract/dapp-connector';
import { exposeApi } from '@lace-sdk/extension-messaging';
import { of } from 'rxjs';
import { runtime } from 'webextension-polyfill';

import {
  STORE_CHANNEL,
  featureFlagApiProperties,
  remoteStoreApiProperties,
} from '../util';

import type { FeatureFlagApi, RemoteStore } from '../util';
import type { Shutdown, WithLogger } from '@cardano-sdk/util';

export interface APIs {
  featureFlags: FeatureFlagApi;
  remoteStore: RemoteStore;
}

export const exposeAPIs = (
  { remoteStore, featureFlags }: Readonly<APIs>,
  { logger }: Readonly<WithLogger>,
): Shutdown => {
  const exposeApiDependencies = { logger, runtime };
  const remoteStoreApi = exposeApi(
    {
      api$: of(remoteStore),
      baseChannel: STORE_CHANNEL,
      properties: remoteStoreApiProperties,
    },
    exposeApiDependencies,
  );
  const featureFlagApi = exposeApi(
    {
      api$: of(featureFlags),
      baseChannel: FEATURE_FLAGS_CHANNEL,
      properties: featureFlagApiProperties,
    },
    exposeApiDependencies,
  );
  return {
    shutdown: () => {
      remoteStoreApi.shutdown();
      featureFlagApi.shutdown();
    },
  };
};
