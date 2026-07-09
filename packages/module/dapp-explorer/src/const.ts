import { FeatureFlagKey } from '@lace-contract/feature';

export const FEATURE_FLAG_DAPP_EXPLORER = FeatureFlagKey('DAPP_EXPLORER');
export const DAPP_DATA_RANGE_PERIOD = '30d'; // Options are: 24h, 7d, 30d, LW-XXXXX to allow other options from posthog
export const CARDANO_CUBE_PER_PAGE = 500;
export const EXCLUDED_CATEGORY_SLUGS = ['light-wallets'];
