import { webcrypto } from 'node:crypto';

import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import { InMemoryKeyAgent, KeyPurpose } from '@cardano-sdk/key-management';
import { dummyLogger } from 'ts-log';

import type { Cardano } from '@cardano-sdk/core';

if (!globalThis.crypto)
  (globalThis as { crypto?: Crypto }).crypto = webcrypto as unknown as Crypto;

/**
 * Derives an account's first address from a mnemonic. Returns a
 * self-contained account bag for signing and tx building.
 */
export const deriveTestAccount = async ({
  mnemonic,
  chainId,
  accountIndex,
}: {
  mnemonic: string[];
  chainId: Cardano.ChainId;
  accountIndex: number;
}) => {
  // Builds the raw InMemoryKeyAgent instead of calling
  // createCardanoKeyAgentFromMnemonic since we need deriveAddress and
  // extendedAccountPublicKey, which that helper's wrapped agent hides.
  const bip32Ed25519 = await SodiumBip32Ed25519.create();
  const keyAgent = await InMemoryKeyAgent.fromBip39MnemonicWords(
    {
      accountIndex,
      chainId,
      getPassphrase: async () => webcrypto.getRandomValues(new Uint8Array(32)),
      mnemonicWords: mnemonic,
      purpose: KeyPurpose.STANDARD,
    },
    { bip32Ed25519, logger: dummyLogger },
  );
  const grouped = await keyAgent.deriveAddress({ index: 0, type: 0 }, 0);
  return {
    mnemonic,
    accountIndex,
    chainId,
    address: grouped.address,
    rewardAccount: grouped.rewardAccount,
    extendedAccountPublicKey: keyAgent.extendedAccountPublicKey,
    knownAddresses: [grouped],
    grouped,
  };
};

export type DerivedAccount = Awaited<ReturnType<typeof deriveTestAccount>>;
