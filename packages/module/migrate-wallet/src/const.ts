import { FeatureFlagKey } from '@lace-contract/feature';

export const MIGRATE_WALLET_FEATURE_FLAG = FeatureFlagKey('MIGRATE_WALLET');

/**
 * Selection id the wizard's pool-choice step passes to the browse-pools picker
 * and its consumption side effect matches on. A fixed id, not per-account like
 * earn-rewards': one wizard runs at a time, and the choice belongs to the run,
 * not to an account.
 */
export const MIGRATE_WALLET_POOL_SELECTION_ID = 'migrate-wallet';
