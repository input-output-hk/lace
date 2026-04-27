import * as Crypto from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import { Bip32WalletId } from '../../src';

describe('value-objects/wallet-id', () => {
  describe('fromBip32PublicKey', () => {
    it('can create unique id for public keys', async () => {
      const id1 = Bip32WalletId.fromBip32PublicKey(
        Crypto.Bip32PublicKeyHex(
          '3e33018e8293d319ef5b3ac72366dd28006bd315b715f7e7cfcbd3004129b80d3e33018e8293d319ef5b3ac72366dd28006bd315b715f7e7cfcbd3004129b80d',
        ),
      );
      const id2 = Bip32WalletId.fromBip32PublicKey(
        Crypto.Bip32PublicKeyHex(
          '4e33018e8293d319ef5b3ac72366dd28006bd315b715f7e7cfcbd3004129b80d3e33018e8293d319ef5b3ac72366dd28006bd315b715f7e7cfcbd3004129b80d',
        ),
      );
      expect(id1).not.toEqual(id2);
    });
  });
});
