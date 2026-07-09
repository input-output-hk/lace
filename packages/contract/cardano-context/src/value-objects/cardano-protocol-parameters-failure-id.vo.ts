import type { CardanoNetworkId } from './cardano-network-id.vo';
import type { FailureId } from '@lace-contract/failures';
import type { Tagged } from 'type-fest';

/**
 * Failure ID for Cardano protocol parameters fetch failures.
 *
 * Stable per network so a subsequent successful fetch (triggered by a chainId
 * change back to this network) can auto-dismiss the failure.
 *
 * Format: `cardano-protocol-parameters-${network}`
 */
export type CardanoProtocolParametersFailureId = FailureId &
  Tagged<string, 'CardanoProtocolParametersFailureId'>;

const PREFIX = 'cardano-protocol-parameters-';

export const CardanoProtocolParametersFailureId = (
  network: CardanoNetworkId,
): CardanoProtocolParametersFailureId =>
  `${PREFIX}${network}` as CardanoProtocolParametersFailureId;
