import * as Ledger from '@cardano-foundation/ledgerjs-hw-app-cardano';

import { mapAuxiliaryData } from '../../src/transformers/auxiliaryData';
import { txBody } from '../testData';

import type { Cardano } from '@lace-lib/cardano-core';

describe('auxiliaryData', () => {
  describe('mapAuxiliaryData', () => {
    it('returns null when given an undefined auxiliary data hash', async () => {
      const aux: Cardano.AuxiliaryData | undefined = undefined;
      const ledgerAssets = mapAuxiliaryData(aux);

      expect(ledgerAssets).toEqual(null);
    });

    it('can map a valid auxiliary data hash to the ledger auxiliary data hash type', async () => {
      const hash = mapAuxiliaryData(txBody.auxiliaryDataHash);

      expect(hash).toEqual({
        params: {
          hashHex:
            '2ceb364d93225b4a0f004a0975a13eb50c3cc6348474b4fe9121f8dc72ca0cfa',
        },
        type: Ledger.TxAuxiliaryDataType.ARBITRARY_HASH,
      });
    });
  });
});
