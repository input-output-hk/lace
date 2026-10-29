import * as Crypto from '@lace-lib/cardano-crypto';
import { HexBlob } from '@lace-lib/util/common';

import { Cardano } from '../../../src';
import { ByronAddressType } from '../../../src/Cardano';
import * as cip19TestVectors from '../../Cip19TestVectors';

describe('Cardano/Address/ByronAddress', () => {
  it('fromCredentials can build the correct ByronAddress instance', () => {
    const address = Cardano.ByronAddress.fromCredentials(
      Crypto.Hash28ByteBase16(
        '9c708538a763ff27169987a489e35057ef3cd3778c05e96f7ba9450e',
      ),
      {
        derivationPath: HexBlob(
          '9c1722f7e446689256e1a30260f3510d558d99d0c391f2ba89cb6977',
        ),
        magic: 1_097_911_063,
      },
      ByronAddressType.PubKey,
    );
    expect(address.toAddress().toBase58()).toEqual(
      cip19TestVectors.byronTestnetDaedalus,
    );
  });
});
