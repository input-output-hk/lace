import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import { KeyPurpose, util } from '@cardano-sdk/key-management';
import { SecretBox } from '@lace-lib/core';

import type {
  Bip32PrivateKeyHex,
  Bip32PublicKeyHex,
} from '@cardano-sdk/crypto';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { HexBytes } from '@lace-lib/util';

/**
 * Derives the extended account public key (xpub) at an arbitrary BIP44 account
 * index from a wallet's persisted encrypted root, unlocked with the AuthSecret.
 * Mirrors the account-0 import derivation (`createAccounts`) so a scan of
 * accounts the wallet never imported reproduces exactly the xpub import would
 * have produced.
 *
 * Key hygiene: the decrypted root BYTES are zeroed in `finally`. The SDK key API
 * (`deriveAccountPrivateKey` / `getBip32PublicKey`) takes and returns
 * `Bip32PrivateKeyHex`, an immutable string that cannot be wiped. That transient
 * exposure is inherent to the API and identical to the account-0 import path.
 * Callers must run this under a per-iteration `accessAuthSecret` (so the secret
 * clone is bounded to one derive) and must never persist or dispatch the result
 * alongside key material.
 */
export const deriveAccountExtendedPublicKey = async ({
  encryptedRootPrivateKey,
  accountIndex,
  authSecret,
}: {
  encryptedRootPrivateKey: HexBytes;
  accountIndex: number;
  authSecret: AuthSecret;
}): Promise<Bip32PublicKeyHex> => {
  const bip32Ed25519 = await SodiumBip32Ed25519.create();
  const rootPrivateKeyBytes = await SecretBox.open(
    Buffer.from(encryptedRootPrivateKey, 'hex'),
    authSecret,
  );
  try {
    const accountPrivateKey = await util.deriveAccountPrivateKey({
      accountIndex,
      bip32Ed25519,
      purpose: KeyPurpose.STANDARD,
      rootPrivateKey: Buffer.from(rootPrivateKeyBytes).toString(
        'hex',
      ) as Bip32PrivateKeyHex,
    });
    return bip32Ed25519.getBip32PublicKey(accountPrivateKey);
  } finally {
    rootPrivateKeyBytes.fill(0);
  }
};
