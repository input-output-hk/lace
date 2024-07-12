import { TxCBOR, Cardano } from '@cardano-sdk/core';

export const cborToTransaction = (cborHex: TxCBOR): Cardano.Tx<Cardano.TxBody> => TxCBOR.deserialize(cborHex);
