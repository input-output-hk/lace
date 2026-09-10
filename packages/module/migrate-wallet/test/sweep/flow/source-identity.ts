import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import { InMemoryKeyAgent, KeyPurpose } from '@cardano-sdk/key-management';
import { HexBytes } from '@lace-lib/util';
import { dummyLogger } from 'ts-log';

import type { Cardano } from '@cardano-sdk/core';
import type { SerializableInMemoryKeyAgentData } from '@cardano-sdk/key-management';

/**
 * Fixed headless passphrase. The sweep signer reopens the wallet's encrypted
 * root under the secret `accessAuthSecret` hands back, and the scan derives each
 * extra account's xpub the same way, so buildEncryptedRoot (on the wallet) and
 * accessAuthSecret (in the dependencies) must agree on it.
 */
export const HEADLESS_AUTH_SECRET = new Uint8Array(32).fill(7);

/**
 * The wallet's encrypted root, produced the way import produces it: an
 * InMemoryKeyAgent built from the source mnemonic under HEADLESS_AUTH_SECRET,
 * whose `encryptedRootPrivateKeyBytes` the signer and the scan later reopen with
 * the same secret.
 */
export const buildEncryptedRoot = async (
  mnemonic: string[],
  chainId: Cardano.ChainId,
): Promise<HexBytes> => {
  const bip32Ed25519 = await SodiumBip32Ed25519.create();
  const agent = await InMemoryKeyAgent.fromBip39MnemonicWords(
    {
      accountIndex: 0,
      chainId,
      getPassphrase: async () => HEADLESS_AUTH_SECRET,
      mnemonicWords: mnemonic,
      purpose: KeyPurpose.STANDARD,
    },
    { bip32Ed25519, logger: dummyLogger },
  );
  const data = agent.serializableData as SerializableInMemoryKeyAgentData;
  return HexBytes(
    Buffer.from(data.encryptedRootPrivateKeyBytes).toString('hex'),
  );
};
