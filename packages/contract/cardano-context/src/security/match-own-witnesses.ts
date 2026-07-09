import { Cardano } from '@cardano-sdk/core';
import { Ed25519PublicKey } from '@cardano-sdk/crypto';

import type { CardanoPaymentAddress, CardanoRewardAccount } from '../types';
import type * as Crypto from '@cardano-sdk/crypto';

export const computeOwnKeyHashes = (
  accountAddresses: CardanoPaymentAddress[],
  rewardAccount: CardanoRewardAccount,
): Set<string> => {
  const hashes = new Set<string>();

  for (const address of accountAddresses) {
    const parsed = Cardano.Address.fromBech32(address);
    const credential =
      parsed.asBase()?.getPaymentCredential() ??
      parsed.asEnterprise()?.getPaymentCredential() ??
      parsed.asPointer()?.getPaymentCredential();
    if (credential?.type === Cardano.CredentialType.KeyHash) {
      hashes.add(credential.hash);
    }
  }

  const rewardCredential = Cardano.Address.fromBech32(rewardAccount)
    .asReward()
    ?.getPaymentCredential();
  if (rewardCredential?.type === Cardano.CredentialType.KeyHash) {
    hashes.add(rewardCredential.hash);
  }

  return hashes;
};

/** Keep only witnesses whose vkey hashes to an entry in `ownKeyHashes`. */
export const filterOwnWitnesses = (
  signatures: ReadonlyMap<
    Crypto.Ed25519PublicKeyHex,
    Crypto.Ed25519SignatureHex
  >,
  ownKeyHashes: ReadonlySet<string>,
): Array<[Crypto.Ed25519PublicKeyHex, Crypto.Ed25519SignatureHex]> => {
  const owned: Array<[Crypto.Ed25519PublicKeyHex, Crypto.Ed25519SignatureHex]> =
    [];
  for (const [vkey, signature] of signatures) {
    const keyHash = Ed25519PublicKey.fromHex(vkey).hash().hex();
    if (ownKeyHashes.has(keyHash)) owned.push([vkey, signature]);
  }
  return owned;
};
