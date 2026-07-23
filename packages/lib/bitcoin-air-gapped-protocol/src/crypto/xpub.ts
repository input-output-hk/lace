import { HDKey } from '@scure/bip32';

/** BIP-32 version bytes for an extended public key (xpub) on mainnet. */
export const XPUB_VERSION_MAINNET = 0x04_88_b2_1e;

/** BIP-32 version bytes for an extended private key (xprv) on mainnet. */
const XPRV_VERSION_MAINNET = 0x04_88_ad_e4;

/** Components needed to serialize a BIP-32 extended public key. */
export interface ExtendedPublicKeyParts {
  version: number;
  depth: number;
  parentFingerprint: number;
  childNumber: number;
  chainCode: Uint8Array;
  publicKey: Uint8Array;
}

/**
 * Serializes BIP-32 extended public key parts into a Base58Check string via
 * '@scure/bip32' HDKey. The 78-byte layout (4 version, 1 depth, 4
 * parent-fingerprint, 4 child-number, 32 chain-code, 33 compressed public key)
 * and the double-SHA256 Base58Check checksum are handled by HDKey.
 *
 * The 'version' field selects the emitted prefix (xpub for mainnet, tpub for
 * testnet). The air-gapped message layer always passes XPUB_VERSION_MAINNET,
 * matching the always-xpub decision in messages/crypto-hdkey.ts.
 */
export const serializeExtendedPublicKey = ({
  version,
  depth,
  parentFingerprint,
  childNumber,
  chainCode,
  publicKey,
}: ExtendedPublicKeyParts): string => {
  if (chainCode.length !== 32) {
    throw new Error(`chain code must be 32 bytes, got ${chainCode.length}`);
  }
  if (publicKey.length !== 33) {
    throw new Error(`public key must be 33 bytes, got ${publicKey.length}`);
  }
  if (depth < 0 || depth > 0xff) {
    throw new Error(`depth out of range: ${depth}`);
  }
  const hdKey = new HDKey({
    versions: { public: version, private: XPRV_VERSION_MAINNET },
    depth,
    index: childNumber,
    parentFingerprint,
    chainCode,
    publicKey,
  });
  return hdKey.publicExtendedKey;
};
