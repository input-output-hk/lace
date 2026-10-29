import {
  cborNetworkBindingRefusal,
  networkBindingRefusal,
} from '../../src/common/store/utils/network-binding';

import type { Cardano } from '@cardano-sdk/core';

/**
 * The rule's refusal read as a verdict. Production always wants the CAUSE, so
 * the rule returns one and these live here rather than beside it — a boolean
 * export with only test callers is dead weight in `src/`.
 */
export const isBoundToNetwork = (
  body: Cardano.TxBody,
  networkId: Cardano.NetworkId,
): boolean => networkBindingRefusal(body, networkId) === null;

export const isCborBoundToNetwork = (
  txCbor: string,
  networkId: Cardano.NetworkId,
): boolean => cborNetworkBindingRefusal(txCbor, networkId) === null;
