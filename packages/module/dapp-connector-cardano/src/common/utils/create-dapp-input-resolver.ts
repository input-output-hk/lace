import { Serialization } from '@cardano-sdk/core';

import { txInEquals } from '../store/utils/input-resolver';

import type { SerializedForeignResolvedInput } from '../store/slice';
import type { Cardano } from '@cardano-sdk/core';
import type { HexBlob } from '@cardano-sdk/util';

/**
 * Build an `InputResolver` that answers entirely from pre-resolved inputs.
 *
 * The resolver is used by the SDK's `tokenTransferInspector` and
 * `transactionSummaryInspector` to walk transaction inputs in order to
 * classify them as own/foreign and compute value flows.
 *
 * Lookup order:
 * 1. Local UTXOs from the active Cardano account (always available).
 * 2. Foreign inputs already resolved by the `resolve-foreign-inputs`
 *    side effect and stashed in Redux as CBOR-encoded `TxOut`s.
 *
 * No network calls happen here — foreign inputs must have been pre-resolved
 * by the side effect before the sign-tx view renders.
 */
export const createDappInputResolver = (
  localUtxos: Cardano.Utxo[],
  foreignResolvedInputs: readonly SerializedForeignResolvedInput[],
): Cardano.InputResolver => ({
  resolveInput: async (txIn: Cardano.TxIn): Promise<Cardano.TxOut | null> => {
    const localMatch = localUtxos.find(([input]) => txInEquals(input, txIn));
    if (localMatch) return localMatch[1];

    const foreignMatch = foreignResolvedInputs.find(
      entry => entry.txIn.txId === txIn.txId && entry.txIn.index === txIn.index,
    );
    if (!foreignMatch) return null;

    return Serialization.TransactionOutput.fromCbor(
      foreignMatch.txOutCbor as HexBlob,
    ).toCore();
  },
});
