import { Cardano } from '@cardano-sdk/core';
import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import {
  InMemoryKeyAgent,
  KeyPurpose,
  type SerializableInMemoryKeyAgentData,
} from '@cardano-sdk/key-management';
import { dummyLogger } from 'ts-log';

import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';

/** Use the same CIP-3 Icarus account derivation as Cardano's wallet integration. */
export const passkeyAccountPublicKey = async (
  words: readonly string[],
): Promise<Bip32PublicKeyHex> => {
  const passphrase = crypto.getRandomValues(new Uint8Array(32));
  try {
    const agent = await InMemoryKeyAgent.fromBip39MnemonicWords(
      {
        accountIndex: 0,
        chainId: Cardano.ChainIds.Mainnet,
        getPassphrase: async () => passphrase,
        mnemonicWords: [...words],
        purpose: KeyPurpose.STANDARD,
      },
      { bip32Ed25519: await SodiumBip32Ed25519.create(), logger: dummyLogger },
    );
    return (agent.serializableData as SerializableInMemoryKeyAgentData)
      .extendedAccountPublicKey;
  } finally {
    passphrase.fill(0);
  }
};
