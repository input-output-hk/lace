import * as Crypto from '@lace-lib/cardano-crypto';

import { util } from '../../src';

describe('toEd25519KeyPair', () => {
  it('strips the chain code from both keys and keeps them a matching pair', async () => {
    const bip32Ed25519 = await Crypto.SodiumBip32Ed25519.create();
    const skey = bip32Ed25519.fromBip39Entropy(Buffer.alloc(32, 7), '');
    const vkey = bip32Ed25519.getBip32PublicKey(skey);

    const pair = await util.toEd25519KeyPair({ skey, vkey }, bip32Ed25519);

    expect(pair.skey).toBe(skey.slice(0, 128));
    expect(pair.vkey).toBe(vkey.slice(0, 64));
    expect(bip32Ed25519.getPublicKey(pair.skey)).toBe(pair.vkey);
  });
});
