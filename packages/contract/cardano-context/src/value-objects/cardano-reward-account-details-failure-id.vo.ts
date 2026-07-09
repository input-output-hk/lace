import type { FailureId } from '@lace-contract/failures';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

/**
 * Failure ID for Cardano per-account reward account details fetch failures.
 *
 * Stable per account so that a subsequent successful fetch (triggered by the
 * next account-data change) can auto-dismiss the failure.
 *
 * Format: `cardano-reward-account-details-${accountId}`
 */
export type CardanoRewardAccountDetailsFailureId = FailureId &
  Tagged<string, 'CardanoRewardAccountDetailsFailureId'>;

const PREFIX = 'cardano-reward-account-details-';

export const CardanoRewardAccountDetailsFailureId = (
  accountId: AccountId,
): CardanoRewardAccountDetailsFailureId =>
  `${PREFIX}${accountId}` as CardanoRewardAccountDetailsFailureId;
