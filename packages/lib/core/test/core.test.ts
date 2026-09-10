import { Crypto } from '@lace-lib/vendor';
import { describe, expect, it } from 'vitest';

import {
  decryptRecoveryPhrase,
  deriveBip32PublicKey,
  emip3decrypt,
  emip3encrypt,
  encryptRecoveryPhrase,
  hashEd25519PublicKey,
  KeyRole,
  WalletId,
} from '../src';

// A fixed account extended public key (m/1852'/1815'/0') — its derived values are
// stable across the @cardano-sdk version this lib depends on.
const ACCOUNT_XPUB = Crypto.Bip32PublicKeyHex(
  'b3f8aad750c8f498d2882d1ecd74bf550e81870e89acaed82e8e10ef5871887091286d601ecfe0aafc2121154db787bf489ccf35c6b5db5d60096052c8b34c2f',
);

describe('@lace-lib/core', () => {
  it('recovery-phrase seal/reveal round-trips; a wrong passphrase throws', async () => {
    const words =
      'legal winner thank year wave sausage worth useful legal winner thank yellow'.split(
        ' ',
      );
    const sealed = await encryptRecoveryPhrase(
      words,
      new TextEncoder().encode('correct horse'),
    );
    expect(
      await decryptRecoveryPhrase(
        sealed,
        new TextEncoder().encode('correct horse'),
      ),
    ).toEqual(words);
    await expect(
      decryptRecoveryPhrase(sealed, new TextEncoder().encode('wrong')),
    ).rejects.toThrow();
  });

  it('emip3 round-trips through @cardano-sdk', async () => {
    const data = Uint8Array.from([0xc0, 0xff, 0xee, 0x12, 0x34]);
    const passphrase = Uint8Array.from([0x70, 0x61, 0x73, 0x73]);
    const decrypted = await emip3decrypt(
      await emip3encrypt(data, passphrase),
      passphrase,
    );
    expect([...decrypted]).toEqual([...data]);
  });

  it('derives a walletId from an account xpub (double blake2b-128)', () => {
    expect(WalletId.deriveFromBip32PublicKey(ACCOUNT_XPUB)).toBe(
      'f1be69a43b84aab3243cda310484a710',
    );
  });

  it('derives a walletId from a hardware master fingerprint, case-insensitively and in the shared 32-hex format', () => {
    expect(
      WalletId.deriveFromHardwareFingerprint('ledger', '5436d724'),
    ).toMatch(/^[0-9a-f]{32}$/u);
    expect(WalletId.deriveFromHardwareFingerprint('ledger', '5436D724')).toBe(
      WalletId.deriveFromHardwareFingerprint('ledger', '5436d724'),
    );
  });

  it('domain-separates the hardware fingerprint mint by vendor, so one seed on two device families is two wallets', () => {
    expect(
      WalletId.deriveFromHardwareFingerprint('ledger', '5436d724'),
    ).not.toBe(WalletId.deriveFromHardwareFingerprint('trezor', '5436d724'));
  });

  it('derives the external/index-0 public key and its credential hash', async () => {
    const publicKey = await deriveBip32PublicKey(
      ACCOUNT_XPUB,
      KeyRole.External,
      0,
    );
    expect(publicKey).toBe(
      '63c5d69570349e4233a0575811464f0e8a3fd329abe76e9bdc3d3f1b95982179',
    );
    expect(hashEd25519PublicKey(publicKey)).toBe(
      '00b7847c89d5721592fc0cc8932f50a8f8258b39b93861140a1b99fb',
    );
  });
});
