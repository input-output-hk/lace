import {
  Ed25519PublicKey,
  SodiumBip32Ed25519,
  blake2b,
} from '@cardano-sdk/crypto';
import {
  Bip32Account,
  InMemoryKeyAgent,
  KeyPurpose,
  KeyRole,
  util,
} from '@cardano-sdk/key-management';
import { ByteArray } from '@lace-sdk/util';
import { dummyLogger } from 'ts-log';

import { createInputResolver } from '../util';

import type { CardanoKeyAgent } from './types';
import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex, Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { HexBytes } from '@lace-sdk/util';

export type CreateCardanoKeyAgentFromMnemonicProps = {
  accountIndex: number;
  chainId: Cardano.ChainId;
  mnemonicWords: string[];
};

/**
 * Builds a {@link CardanoKeyAgent} from a BIP-39 mnemonic.
 *
 * The mnemonic is encrypted in memory under a single-use session passphrase
 * generated per call. The agent is meant to be discarded immediately after a
 * single sign call so the in-memory ciphertext (and its passphrase) become
 * unreachable along with it.
 */
export const createCardanoKeyAgentFromMnemonic = async ({
  accountIndex,
  chainId,
  mnemonicWords,
}: CreateCardanoKeyAgentFromMnemonicProps): Promise<CardanoKeyAgent> => {
  const bip32Ed25519 = await SodiumBip32Ed25519.create();
  const sessionPassphrase = crypto.getRandomValues(new Uint8Array(32));

  const keyAgent = await InMemoryKeyAgent.fromBip39MnemonicWords(
    {
      accountIndex,
      chainId,
      getPassphrase: async () => sessionPassphrase,
      mnemonicWords,
      purpose: KeyPurpose.STANDARD,
    },
    { bip32Ed25519, logger: dummyLogger },
  );

  return wrapInMemoryKeyAgent(keyAgent);
};

export type CreateCardanoKeyAgentFromEncryptedRootProps = {
  accountIndex: number;
  chainId: Cardano.ChainId;
  encryptedRootPrivateKey: HexBytes;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  authSecret: AuthSecret;
};

/**
 * Builds a {@link CardanoKeyAgent} from an encrypted root private key,
 * unlocked with the supplied {@link AuthSecret}.
 */
export const createCardanoKeyAgentFromEncryptedRoot = async ({
  accountIndex,
  chainId,
  encryptedRootPrivateKey,
  extendedAccountPublicKey,
  authSecret,
}: CreateCardanoKeyAgentFromEncryptedRootProps): Promise<CardanoKeyAgent> => {
  const bip32Ed25519 = await SodiumBip32Ed25519.create();

  const keyAgent = new InMemoryKeyAgent(
    {
      accountIndex,
      chainId,
      encryptedRootPrivateKeyBytes: [
        ...ByteArray.fromHex(encryptedRootPrivateKey),
      ],
      extendedAccountPublicKey,
      getPassphrase: async () => authSecret,
      purpose: KeyPurpose.STANDARD,
    },
    { bip32Ed25519, logger: dummyLogger },
  );

  return wrapInMemoryKeyAgent(keyAgent);
};

export type DeriveDRepKeyHashProps = {
  accountIndex: number;
  chainId: Cardano.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
};

/** Derives the CIP-95 DRep public-key hash for the given account. */
export const deriveDRepKeyHash = async ({
  accountIndex,
  chainId,
  extendedAccountPublicKey,
}: DeriveDRepKeyHashProps): Promise<Ed25519KeyHashHex> => {
  const bip32Ed25519 = await SodiumBip32Ed25519.create();
  const bip32Account = new Bip32Account(
    { accountIndex, chainId, extendedAccountPublicKey },
    { blake2b, bip32Ed25519 },
  );
  const dRepPubKey = await bip32Account.derivePublicKey({
    index: 0,
    role: KeyRole.DRep,
  });
  return Ed25519PublicKey.fromHex(dRepPubKey).hash().hex();
};

const wrapInMemoryKeyAgent = (keyAgent: InMemoryKeyAgent): CardanoKeyAgent => ({
  signTransaction: async (txBody, context) => {
    const txInKeyPathMap = await util.createTxInKeyPathMap(
      txBody.toCore(),
      context.knownAddresses,
      createInputResolver(context.utxo),
    );
    return keyAgent.signTransaction(txBody, {
      knownAddresses: context.knownAddresses,
      txInKeyPathMap,
    });
  },
  signBlob: async (derivationPath, blob) =>
    keyAgent.signBlob(derivationPath, blob),
});
