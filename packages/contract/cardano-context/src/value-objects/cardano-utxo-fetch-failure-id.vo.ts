import type { FailureId } from '@lace-contract/failures';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

/**
 * Failure ID for Cardano per-account UTxO fetch failures.
 *
 * Stable per account so that a subsequent successful fetch (triggered by the
 * next most-recent transaction hash change) can auto-dismiss the failure.
 *
 * Format: `cardano-utxo-fetch-${accountId}`
 */
export type CardanoUtxoFetchFailureId = FailureId &
  Tagged<string, 'CardanoUtxoFetchFailureId'>;

const CARDANO_UTXO_FETCH_PREFIX = 'cardano-utxo-fetch-';

export const CardanoUtxoFetchFailureId = (
  accountId: AccountId,
): CardanoUtxoFetchFailureId =>
  `${CARDANO_UTXO_FETCH_PREFIX}${accountId}` as CardanoUtxoFetchFailureId;
