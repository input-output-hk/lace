import { PAUSE_NETWORK_POLLING_FEATURE_FLAG } from '@lace-contract/app-lock';
import { FEATURE_FLAG_WALLET_SECURITY_ALERTS } from '@lace-contract/cardano-context';
import { FeatureFlagKey } from '@lace-contract/feature';
import { testFeatureFlagCompatibility } from '@lace-lib/util-dev-app';
import { ADA_HANDLE_FEATURE_FLAG } from '@lace-module/ada-handle';
import { MD_MIGRATION_FEATURE_FLAG } from '@lace-module/migrate-multi-delegation';
import { describe, expect, it } from 'vitest';

import defaultFeatureFlags from '../src/app/feature-flags';
import { allModules } from '../src/app/util/all-modules';

const DEBUG_FLAGS = [
  FeatureFlagKey('FEATURES_DEV'),
  FeatureFlagKey('TEST_API'),
];

describe('Production safety', () => {
  it('should not include debug flags in defaultFeatureFlags', () => {
    const defaultKeys = defaultFeatureFlags.map(f => f.key);
    const found = DEBUG_FLAGS.filter(key => defaultKeys.includes(key));
    expect(found).toEqual([]);
  });
});

const productionFeatureFlags = defaultFeatureFlags.filter(
  f => !DEBUG_FLAGS.includes(f.key),
);

const experimentalFeatureFlags = [
  { key: FeatureFlagKey('ACTIVITIES') },
  { key: FeatureFlagKey('IDENTITY_CENTER') },
  { key: FeatureFlagKey('BLOCKCHAIN_MIDNIGHT') },
  { key: FeatureFlagKey('BLOCKCHAIN_BITCOIN') },
  { key: FeatureFlagKey('BITCOIN_MEMPOOL_FEE_MARKET') },
  { key: FeatureFlagKey('CARDANO_URI_LINKING') },
  { key: MD_MIGRATION_FEATURE_FLAG },
  { key: ADA_HANDLE_FEATURE_FLAG },
  { key: FeatureFlagKey('MIDNIGHT_DISCLAIMER') },
  { key: PAUSE_NETWORK_POLLING_FEATURE_FLAG },
  { key: FEATURE_FLAG_WALLET_SECURITY_ALERTS },
];

testFeatureFlagCompatibility(
  allModules,
  productionFeatureFlags,
  experimentalFeatureFlags,
);
