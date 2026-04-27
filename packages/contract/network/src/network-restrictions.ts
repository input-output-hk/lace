import { FeatureFlagKey } from '@lace-contract/feature';

import { FeatureIds } from './value-objects';

import type { NetworkType } from './store/types';
import type { FeatureId } from './value-objects';
import type { FeatureFlag } from '@lace-contract/feature';

export type NetworkRestriction = {
  allowedNetworks: NetworkType[];
  featureFlagKey?: FeatureFlagKey;
};

export const FEATURE_NETWORK_RESTRICTIONS: Partial<
  Record<FeatureId, NetworkRestriction>
> = {
  [FeatureIds.BUY_FLOW]: { allowedNetworks: ['mainnet'] },
  [FeatureIds.DAPP_EXPLORER]: {
    allowedNetworks: ['mainnet'],
    featureFlagKey: FeatureFlagKey('DAPP_EXPLORER'),
  },
  [FeatureIds.SWAP_CENTER]: {
    allowedNetworks: ['mainnet'],
    featureFlagKey: FeatureFlagKey('SWAP_CENTER'),
  },
};

export const isFeatureAvailableForNetwork = (
  featureId: FeatureId,
  networkType: NetworkType,
  featureFlags: readonly FeatureFlag[],
): boolean => {
  const restriction = FEATURE_NETWORK_RESTRICTIONS[featureId];
  if (!restriction) return true; // Default available

  const isNetworkAllowed = restriction.allowedNetworks.includes(networkType);
  if (!isNetworkAllowed) return false;

  if (restriction.featureFlagKey) {
    return featureFlags.some(flag => flag.key === restriction.featureFlagKey);
  }
  return true;
};
