import { Serialization, TxCBOR, Cardano } from '@cardano-sdk/core';

export const transactionToCbor = (cborHex: TxCBOR): Cardano.Tx<Cardano.TxBody> =>
  Serialization.Transaction.fromCbor(cborHex).toCore();
