import type { FailureId } from '@lace-contract/failures';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

/**
 * Failure ID for Cardano per-account rewards history fetch failures.
 *
 * Stable per account so that a subsequent successful fetch (triggered by the
 * next address/chainId change) can auto-dismiss the failure.
 *
 * Format: `cardano-rewards-history-${accountId}`
 */
export type CardanoRewardsHistoryFailureId = FailureId &
  Tagged<string, 'CardanoRewardsHistoryFailureId'>;

const PREFIX = 'cardano-rewards-history-';

export const CardanoRewardsHistoryFailureId = (
  accountId: AccountId,
): CardanoRewardsHistoryFailureId =>
  `${PREFIX}${accountId}` as CardanoRewardsHistoryFailureId;
