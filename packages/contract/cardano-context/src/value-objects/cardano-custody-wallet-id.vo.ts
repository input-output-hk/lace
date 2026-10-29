import { blake2b } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';

import type { Cardano } from '@cardano-sdk/core';
import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import type { WalletId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

const WALLET_ID_BYTES = 16;

/** The walletId of a Cardano custody account. */
export type CardanoCustodyWalletId = Tagged<string, 'CardanoCustodyWalletId'> &
  WalletId;

export const CardanoCustodyWalletId = {
  /**
   * Derives the walletId from the `cardano-custody` domain tag, the network
   * magic and the account's stake script hash, in the `WalletId` format: a
   * double BLAKE2b-128 rendered as 32 hex characters.
   *
   * The stake script hash names the account but is the same on every
   * network, and Preprod and Preview even share the address, so the magic
   * keeps each network's account a wallet of its own. The hash is lower-cased
   * first, so its case never yields a second wallet.
   */
  derive: (
    networkMagic: Cardano.NetworkMagic,
    stakeScriptHash: Hash28ByteBase16,
  ): CardanoCustodyWalletId => {
    const preimage = HexBlob(
      Buffer.from(
        `cardano-custody:${networkMagic}:${stakeScriptHash.toLowerCase()}`,
        'utf8',
      ).toString('hex'),
    );
    const digest = blake2b.hash<HexBlob>(preimage, WALLET_ID_BYTES);
    return blake2b.hash<HexBlob>(
      digest,
      WALLET_ID_BYTES,
    ) as unknown as CardanoCustodyWalletId;
  },
};
