import type { FailureId } from '@lace-contract/failures';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

/**
 * Failure ID for Cardano sync round failures.
 *
 * Extends the base FailureId type using hierarchical pattern (ADR 13).
 * Represents sync failures at the account level, not per individual sync round.
 * This enables stable failure IDs across multiple sync attempts for auto-dismissal.
 *
 * Format: `cardano-sync-${accountId}`
 *
 * @example
 * const failureId = CardanoSyncFailureId(accountId);
 * // Result: 'cardano-sync-wallet123-0-764824073'
 */
export type CardanoSyncFailureId = FailureId &
  Tagged<string, 'CardanoSyncFailureId'>;

const CARDANO_SYNC_PREFIX = 'cardano-sync-';

export const CardanoSyncFailureId = (
  accountId: AccountId,
): CardanoSyncFailureId =>
  `${CARDANO_SYNC_PREFIX}${accountId}` as CardanoSyncFailureId;

/**
 * Type guard to check if a FailureId is a CardanoSyncFailureId.
 */
CardanoSyncFailureId.is = (
  failureId: FailureId,
): failureId is CardanoSyncFailureId =>
  failureId.startsWith(CARDANO_SYNC_PREFIX);

/**
 * Extracts the AccountId from a CardanoSyncFailureId.
 */
CardanoSyncFailureId.extractAccountId = (
  failureId: CardanoSyncFailureId,
): AccountId => failureId.replace(CARDANO_SYNC_PREFIX, '') as AccountId;
