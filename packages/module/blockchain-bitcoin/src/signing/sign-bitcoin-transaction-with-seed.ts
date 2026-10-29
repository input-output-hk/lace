import { HexBytes } from '@lace-lib/util';

import {
  decodeUnsignedTxFromString,
  deriveAccountRootKeyPair,
  deriveChildKeyPair,
  tweakTaprootPrivateKey,
  AddressType,
} from '../common';
import { BitcoinSigner, signTx } from '../wallet';

import type { BitcoinSignResult } from '@lace-contract/bitcoin-context';

/**
 * Signs a serialized unsigned Bitcoin transaction with keys derived from a
 * BIP-39 seed, one key per entry in the transaction's signers list. Taproot
 * signers use the tweaked private key.
 *
 * The signer private keys and the Taproot tweak buffers are zeroed whether
 * signing succeeds or throws. The caller owns the seed: it is read but never
 * mutated or wiped, so the caller must wipe it once signing is done.
 *
 * @param serializedTx - The unsigned transaction as produced by the transaction builder.
 * @param seed - The 64-byte BIP-39 seed of the wallet that owns the inputs.
 * @returns The signed transaction, serialized with its network.
 */
export const signBitcoinTransactionWithSeed = (
  serializedTx: HexBytes,
  seed: Uint8Array,
): BitcoinSignResult => {
  const seedView = Buffer.from(seed.buffer, seed.byteOffset, seed.byteLength);
  const tx = decodeUnsignedTxFromString(serializedTx);
  const signers: BitcoinSigner[] = [];

  try {
    for (const signingKey of tx.signers) {
      const rootKeyPair = deriveAccountRootKeyPair({
        seed: seedView,
        addressType: signingKey.addressType,
        network: signingKey.network,
        account: signingKey.account,
      });

      const keyPair = deriveChildKeyPair(
        rootKeyPair.pair.privateKey,
        signingKey.chain,
        signingKey.index,
      );

      let finalKeyPair = keyPair.pair;

      if (signingKey.addressType === AddressType.Taproot) {
        const internalXOnlyPubKey = keyPair.pair.publicKey.slice(1);
        const childPrivateKey = Buffer.from(keyPair.pair.privateKey, 'hex');

        try {
          const tweakedPrivateKey = tweakTaprootPrivateKey(
            childPrivateKey,
            Buffer.from(internalXOnlyPubKey, 'hex'),
          );

          finalKeyPair = {
            publicKey: keyPair.pair.publicKey,
            privateKey: tweakedPrivateKey.toString('hex'),
          };
          tweakedPrivateKey.fill(0);
        } finally {
          childPrivateKey.fill(0);
        }
      }

      signers.push(
        new BitcoinSigner({
          publicKey: Buffer.from(finalKeyPair.publicKey, 'hex'),
          privateKey: Buffer.from(finalKeyPair.privateKey, 'hex'),
        }),
      );
    }

    const signedTx = signTx(tx, signers);

    return {
      serializedTx: HexBytes.fromUTF8(
        JSON.stringify({
          network: tx.network,
          hex: signedTx.hex,
        }),
      ),
    };
  } finally {
    for (const signer of signers) {
      signer.clearSecrets();
    }
  }
};
