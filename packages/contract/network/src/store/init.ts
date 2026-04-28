import { createMigrate } from 'redux-persist';

import { FEATURE_FLAG_NETWORK_TYPE } from '../const';

import {
  addBlockchainNetworks,
  addInitialNetworkType,
  addTestnetOptions,
  resetTestnetIds,
} from './migrations';
import { networkSideEffects } from './side-effects';
import { initialState, networkReducers } from './slice';
import { parseNetworkTypePayload } from './utils';

import type { NetworkType } from './types';
import type { FeatureFlag } from '@lace-contract/feature';
import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const getFeatureFlagNetworkType = (
  featureFlags: FeatureFlag[],
): NetworkType | undefined => {
  const flag = featureFlags.find(
    featureFlag => featureFlag.key === FEATURE_FLAG_NETWORK_TYPE,
  );
  if (!flag || !('payload' in flag)) return undefined;
  return parseNetworkTypePayload(flag.payload);
};

const store: LaceInit<LaceModuleStoreInit> = ({
  runtime: {
    features: {
      loaded: { featureFlags },
    },
  },
}) => ({
  reducers: networkReducers,
  sideEffects: networkSideEffects,
  preloadedState: {
    network: {
      ...initialState,
      // For fresh installs (no persisted state) both fields are seeded from the
      // flag so the user starts on the correct network. For returning users,
      // redux-persist rehydrates over this, so networkType is never overridden.
      networkType: getFeatureFlagNetworkType(featureFlags) ?? 'mainnet',
      initialNetworkType: getFeatureFlagNetworkType(featureFlags) ?? 'mainnet',
    },
  },
  persistConfig: {
    network: {
      version: 5,
      migrate: createMigrate({
        2: resetTestnetIds,
        3: addBlockchainNetworks,
        4: addTestnetOptions,
        5: addInitialNetworkType,
      }),
    },
  },
});

export default store;
