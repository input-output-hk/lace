import type { CardanoNetworkId } from './cardano-network-id.vo';
import type { FailureId } from '@lace-contract/failures';
import type { Tagged } from 'type-fest';

/**
 * Failure ID for Cardano era summaries fetch failures.
 *
 * Stable per network so a subsequent successful fetch (triggered by a chainId
 * change back to this network) can auto-dismiss the failure.
 *
 * Format: `cardano-era-summaries-${network}`
 */
export type CardanoEraSummariesFailureId = FailureId &
  Tagged<string, 'CardanoEraSummariesFailureId'>;

const PREFIX = 'cardano-era-summaries-';

export const CardanoEraSummariesFailureId = (
  network: CardanoNetworkId,
): CardanoEraSummariesFailureId =>
  `${PREFIX}${network}` as CardanoEraSummariesFailureId;
