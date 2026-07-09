import type { CardanoRewardAccount } from '../types';
import type { FailureId } from '@lace-contract/failures';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

/**
 * Failure ID for Cardano per-(account, rewardAccount) delegation history fetch
 * failures.
 *
 * Stable per (accountId, rewardAccount) so that a subsequent successful fetch
 * (re-triggered by `loadAccountDelegationHistory`) auto-dismisses the failure.
 *
 * Format: `cardano-delegation-${accountId}-${rewardAccount}`
 */
export type CardanoDelegationFailureId = FailureId &
  Tagged<string, 'CardanoDelegationFailureId'>;

const PREFIX = 'cardano-delegation-';

export const CardanoDelegationFailureId = (
  accountId: AccountId,
  rewardAccount: CardanoRewardAccount,
): CardanoDelegationFailureId =>
  `${PREFIX}${accountId}-${rewardAccount}` as CardanoDelegationFailureId;
