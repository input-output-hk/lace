import { FeatureFlagKey, type FeatureFlag } from '@lace-contract/feature';
import { testFeatureFlagCompatibility } from '@lace-lib/util-dev-app';
import { ADA_HANDLE_FEATURE_FLAG } from '@lace-module/ada-handle';
import { FEATURES_DEV_FEATURE_FLAG } from '@lace-module/feature-dev';
import { IDENTITY_FEATURE_FLAG } from '@lace-module/identity-center';
import { MD_MIGRATION_FEATURE_FLAG } from '@lace-module/migrate-multi-delegation';
import { V1_MIGRATION_FEATURE_FLAG } from '@lace-module/migrate-v1-data';
import { FEATURE_FLAG_LEDGER } from '@lace-module/vault-ledger';
import { FEATURE_FLAG_TREZOR } from '@lace-module/vault-trezor';

import defaultFeatureFlags from '../src/feature-flags';
import { allModules } from '../src/util/all-modules';

// Mirrors the intended CI production override (see feature-flags.ts TODO):
// FEATURES_DEV → FEATURES_POSTHOG, TEST_API removed
const productionFeatureFlags = defaultFeatureFlags
  .map(f =>
    f.key === FEATURES_DEV_FEATURE_FLAG
      ? { key: FeatureFlagKey('FEATURES_POSTHOG') }
      : f,
  )
  .filter(f => f.key !== FeatureFlagKey('TEST_API'));

const experimentalFeatureFlags: FeatureFlag[] = [
  { key: V1_MIGRATION_FEATURE_FLAG },
  { key: MD_MIGRATION_FEATURE_FLAG },
  { key: ADA_HANDLE_FEATURE_FLAG },
  { key: IDENTITY_FEATURE_FLAG },
  { key: FEATURE_FLAG_LEDGER },
  { key: FEATURE_FLAG_TREZOR },
];

testFeatureFlagCompatibility(
  allModules,
  productionFeatureFlags,
  experimentalFeatureFlags,
);
