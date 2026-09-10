import { HDKey } from '@scure/bip32';

import { BitcoinNetwork } from './types';

/** BIP-32 mainnet version bytes (xprv/xpub). */
const MAINNET_VERSIONS = { private: 0x04_88_ad_e4, public: 0x04_88_b2_1e };
/** BIP-32 testnet version bytes (tprv/tpub). */
const TESTNET_VERSIONS = { private: 0x04_35_83_94, public: 0x04_35_87_cf };

/**
 * Imports a BIP-32 extended key, tolerating either a mainnet (xpub/xprv) or a
 * testnet (tpub/tprv) version prefix. @scure/bip32 validates the version
 * against a single {private, public} pair, so try mainnet first and fall back
 * to testnet. The version bytes do not affect child derivation; the account's
 * network is tracked separately.
 */
export const hdKeyFromExtendedKey = (extendedKey: string): HDKey => {
  try {
    return HDKey.fromExtendedKey(extendedKey, MAINNET_VERSIONS);
  } catch {
    return HDKey.fromExtendedKey(extendedKey, TESTNET_VERSIONS);
  }
};

/**
 * Re-serializes a BIP-32 extended public key with the version bytes of the
 * given network, for display and export. Stored keys are not consistently
 * serialized for the account's network -- in-memory derivation stores
 * mainnet-encoded keys ('xpub...') for every network, while hardware
 * connectors store the device serialization ('tpub...' on testnet) -- so the
 * key must be normalized at the edge, or the wallet exports a key that
 * misidentifies its network.
 * @throws {Error} If the key is not a valid extended key.
 */
export const bitcoinExtendedPublicKeyForNetwork = (
  extendedPublicKey: string,
  network: BitcoinNetwork,
): string => {
  const node = hdKeyFromExtendedKey(extendedPublicKey);
  if (!node.publicKey || !node.chainCode) {
    throw new Error('Failed to parse Bitcoin extended public key');
  }
  return new HDKey({
    chainCode: node.chainCode,
    depth: node.depth,
    index: node.index,
    parentFingerprint: node.parentFingerprint,
    publicKey: node.publicKey,
    versions:
      network === BitcoinNetwork.Mainnet ? MAINNET_VERSIONS : TESTNET_VERSIONS,
  }).publicExtendedKey;
};
