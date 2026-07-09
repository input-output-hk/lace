import type { FailureId } from '@lace-contract/failures';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

/**
 * Failure ID for Cardano per-account activities processing failures.
 *
 * Stable per account so that a subsequent successful processing run (triggered
 * by the next state change feeding `combineLatest`) can auto-dismiss the
 * failure.
 *
 * Format: `cardano-activities-processing-${accountId}`
 */
export type CardanoActivitiesProcessingFailureId = FailureId &
  Tagged<string, 'CardanoActivitiesProcessingFailureId'>;

const PREFIX = 'cardano-activities-processing-';

export const CardanoActivitiesProcessingFailureId = (
  accountId: AccountId,
): CardanoActivitiesProcessingFailureId =>
  `${PREFIX}${accountId}` as CardanoActivitiesProcessingFailureId;
