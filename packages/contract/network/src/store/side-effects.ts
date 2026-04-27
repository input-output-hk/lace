import { deepEquals, isNotNil } from '@cardano-sdk/util';
import { distinctUntilChanged, filter, map, merge } from 'rxjs';

import { FEATURE_FLAG_NETWORK_TYPE } from '../const';

import { parseNetworkTypePayload } from './utils';

import type { NetworkType } from './types';
import type { SideEffect } from '../contract';

const getFeatureFlagNetworkType = (
  featureFlags: { key: string; payload?: unknown }[],
  fallback: NetworkType,
): NetworkType => {
  const flag = featureFlags.find(f => f.key === FEATURE_FLAG_NETWORK_TYPE);
  return parseNetworkTypePayload(flag?.payload) ?? fallback;
};

/**
 * Keeps `initialNetworkType` always in sync with the `INITIAL_NETWORK_TYPE`
 * feature flag. `networkType` is never modified here — it is exclusively
 * controlled by the user switching between mainnet and testnet.
 */
export const syncInitialNetworkTypeFeatureFlagPayload: SideEffect = (
  _,
  { features: { selectLoadedFeatures$, selectNextFeatureFlags$ } },
  { actions },
) =>
  merge(
    selectLoadedFeatures$.pipe(
      map(({ featureFlags }) =>
        getFeatureFlagNetworkType(featureFlags, 'mainnet'),
      ),
    ),
    selectNextFeatureFlags$.pipe(
      filter(isNotNil),
      map(({ features }) => getFeatureFlagNetworkType(features, 'mainnet')),
    ),
  ).pipe(
    distinctUntilChanged(deepEquals),
    map(payload => actions.network.setInitialNetworkType(payload)),
  );

export const networkSideEffects = [syncInitialNetworkTypeFeatureFlagPayload];
