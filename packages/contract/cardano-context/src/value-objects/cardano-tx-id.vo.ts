import { Serialization } from '@cardano-sdk/core';

import type { Cardano } from '@cardano-sdk/core';
import type { HexBytes } from '@lace-sdk/util';

export type CardanoTxId = Cardano.TransactionId & HexBytes;

export const CardanoTxId = {
  fromCbor: (serializedTx: HexBytes): CardanoTxId =>
    Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(serializedTx),
    ).getId() as CardanoTxId,
};
