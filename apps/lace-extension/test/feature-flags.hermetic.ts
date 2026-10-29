import { FeatureFlagKey } from '@lace-contract/feature';

import defaultFeatureFlags from '../src/feature-flags';

import type { FeatureFlag } from '@lace-contract/feature';

// Only the hermetic build:e2e commands opt into these features.
const featureFlags: FeatureFlag[] = [
  ...defaultFeatureFlags,
  { key: FeatureFlagKey('MIGRATE_WALLET') },
  { key: FeatureFlagKey('NOTIFICATION_CENTER') },
  { key: FeatureFlagKey('SWAP_CENTER'), payload: {} },
  {
    key: FeatureFlagKey('EARN_REWARDS'),
    payload: {
      rate: {
        preprod: { min: 2, max: 4 },
        preview: { min: 2, max: 4 },
      },
    },
  },
  {
    key: FeatureFlagKey('REALFI'),
    payload: { preview: {}, preprod: {} },
  },
];

export default featureFlags;
