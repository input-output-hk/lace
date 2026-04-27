import * as Crypto from '@cardano-sdk/crypto';

import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { HexBlob } from '@cardano-sdk/util';
import type { Tagged } from 'type-fest';

/** For BIP-32 wallets: hash of extended account public key. For script wallets: script hash */
export type WalletId = Tagged<string, 'WalletId'>;
export const WalletId = (walletId: string) => walletId as WalletId;

// TODO: BITCOIN: hoist to lib and remove dependency on cardano-sdk
export type Bip32WalletId = Tagged<string, 'Bip32WalletId'> & WalletId;
export const Bip32WalletId = {
  /**
   * Compute a unique walletId from the extended account public key.
   *
   * @param pubKey The extended account public key.
   */
  fromBip32PublicKey: (pubKey: Bip32PublicKeyHex): WalletId => {
    const BYTES_MIN = 16; // This was Crypto.blake2b.BYTES_MIN before the refactor in cardano-js-sdk
    const digest = Crypto.blake2b.hash<Crypto.Hash32ByteBase16>(
      pubKey,
      BYTES_MIN,
    );

    const walletIdHex = Crypto.blake2b.hash<Crypto.Hash32ByteBase16>(
      digest as HexBlob,
      BYTES_MIN,
    );

    return WalletId(walletIdHex);
  },
};
