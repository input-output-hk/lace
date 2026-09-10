import { HDKey } from '@scure/bip32';
import { describe, expect, it } from 'vitest';

import { bitcoinExtendedPublicKeyForNetwork } from '../src/bip32-serialization';
import { BitcoinNetwork } from '../src/types';

const XPUB =
  'xpub6BgBgsespWvERF3LHQu6CnqdvfEvtMcQjYrcRzx53QJjSxarj2afYWcLteoGVky7D3UKDP9QyrLprQ3VCECoY49yfdDEHGCtMMj92pReUsQ';
const TPUB =
  'tpubDC3pD7UZXnsgh3EBjbtBQiB1FnLask7UHBSunZ1DPK4dCFFZoFRkgxHB8gt42FvLzx1DpxfHWxAsYaY6b643RVcGjDxXxns7wKKYnnfEcbB';

describe('bitcoinExtendedPublicKeyForNetwork', () => {
  it('returns the key unchanged for mainnet', () => {
    expect(
      bitcoinExtendedPublicKeyForNetwork(XPUB, BitcoinNetwork.Mainnet),
    ).toBe(XPUB);
  });

  it('re-serializes a mainnet-encoded key with testnet version bytes', () => {
    expect(
      bitcoinExtendedPublicKeyForNetwork(XPUB, BitcoinNetwork.Testnet),
    ).toBe(TPUB);
  });

  it('accepts a testnet-encoded key (as stored by hardware connectors)', () => {
    expect(
      bitcoinExtendedPublicKeyForNetwork(TPUB, BitcoinNetwork.Testnet),
    ).toBe(TPUB);
    expect(
      bitcoinExtendedPublicKeyForNetwork(TPUB, BitcoinNetwork.Mainnet),
    ).toBe(XPUB);
  });

  it('preserves the key material and metadata across re-serialization', () => {
    const tpub = bitcoinExtendedPublicKeyForNetwork(
      XPUB,
      BitcoinNetwork.Testnet,
    );
    const original = HDKey.fromExtendedKey(XPUB);
    const reserialized = HDKey.fromExtendedKey(tpub, {
      private: 0x04_35_83_94,
      public: 0x04_35_87_cf,
    });
    expect(reserialized.publicKey).toEqual(original.publicKey);
    expect(reserialized.chainCode).toEqual(original.chainCode);
    expect(reserialized.depth).toBe(original.depth);
    expect(reserialized.index).toBe(original.index);
    expect(reserialized.parentFingerprint).toBe(original.parentFingerprint);
  });

  it('throws on a malformed key for either network', () => {
    expect(() =>
      bitcoinExtendedPublicKeyForNetwork('not-a-key', BitcoinNetwork.Testnet),
    ).toThrow();
    expect(() =>
      bitcoinExtendedPublicKeyForNetwork('not-a-key', BitcoinNetwork.Mainnet),
    ).toThrow();
  });
});
