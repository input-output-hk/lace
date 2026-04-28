import { FeatureFlagKey } from '@lace-contract/feature';

export const FEATURE_FLAG_DAPP_EXPLORER = FeatureFlagKey('DAPP_EXPLORER');
export const DAPP_DATA_RANGE_PERIOD = '30d'; // Options are: 24h, 7d, 30d, LW-XXXXX to allow other options from posthog
export const DAPP_DATA_CACHE_AGE = 86400; // Age in cache, 24h
