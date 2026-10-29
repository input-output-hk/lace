import { TxAuxiliaryDataType } from '@cardano-foundation/ledgerjs-hw-app-cardano';

import type * as Ledger from '@cardano-foundation/ledgerjs-hw-app-cardano';
import type * as Crypto from '@lace-lib/cardano-crypto';
import type { Transform } from '@lace-lib/util/common';

const toAuxiliaryData: Transform<
  Crypto.Hash32ByteBase16,
  Ledger.TxAuxiliaryData
> = auxiliaryDataHash => ({
  params: {
    hashHex: auxiliaryDataHash,
  },
  type: TxAuxiliaryDataType.ARBITRARY_HASH,
});

export const mapAuxiliaryData = (auxiliaryDataHash?: Crypto.Hash32ByteBase16) =>
  auxiliaryDataHash ? toAuxiliaryData(auxiliaryDataHash) : null;
