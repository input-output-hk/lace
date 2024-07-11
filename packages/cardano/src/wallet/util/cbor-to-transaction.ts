import { Serialization, TxCBOR, Cardano } from '@cardano-sdk/core';

export const cborToTransaction = (cborHex: TxCBOR): Cardano.Tx<Cardano.TxBody> =>
  Serialization.Transaction.fromCbor(cborHex).toCore();
