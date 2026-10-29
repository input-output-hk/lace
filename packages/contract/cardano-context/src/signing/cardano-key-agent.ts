import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import {
  InMemoryKeyAgent,
  KeyPurpose,
  KeyRole,
  type SerializableInMemoryKeyAgentData,
  util,
} from '@cardano-sdk/key-management';
import {
  deriveBip32PublicKey,
  hashEd25519PublicKey,
  SecretBox,
} from '@lace-lib/core';
import { ByteArray } from '@lace-lib/util';
import { dummyLogger } from 'ts-log';

import { createInputResolver } from '../util';

import type { CardanoKeyAgent } from './types';
import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex, Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { HexBytes } from '@lace-lib/util';

export type CreateCardanoKeyAgentFromMnemonicProps = {
  accountIndex: number;
  chainId: Cardano.ChainId;
  mnemonicWords: string[];
  /**
   * Derivation purpose of the account: CIP-1852 (`STANDARD`, the default) or
   * CIP-1854 (`MULTI_SIG`).
   */
  purpose?: KeyPurpose;
};

/**
 * Builds a {@link CardanoKeyAgent} from a BIP-39 mnemonic.
 *
 * The mnemonic is encrypted in memory under a single-use session passphrase
 * generated per call. The agent is meant to be discarded immediately after a
 * single sign call. Call `dispose` after signing to zero the byte-array
 * passphrase, including on failure or cancellation. JavaScript mnemonic
 * strings cannot be reliably zeroed; callers must not retain them.
 */
export const createCardanoKeyAgentFromMnemonic = async ({
  accountIndex,
  chainId,
  mnemonicWords,
  purpose = KeyPurpose.STANDARD,
}: CreateCardanoKeyAgentFromMnemonicProps): Promise<
  CardanoKeyAgent & { extendedAccountPublicKey: Bip32PublicKeyHex }
> => {
  const bip32Ed25519 = await SodiumBip32Ed25519.create();
  const sessionPassphrase = crypto.getRandomValues(new Uint8Array(32));

  try {
    const keyAgent = await InMemoryKeyAgent.fromBip39MnemonicWords(
      {
        accountIndex,
        chainId,
        getPassphrase: async () => sessionPassphrase,
        mnemonicWords,
        purpose,
      },
      { bip32Ed25519, logger: dummyLogger },
    );

    return {
      ...wrapInMemoryKeyAgent(keyAgent),
      extendedAccountPublicKey: (
        keyAgent.serializableData as SerializableInMemoryKeyAgentData
      ).extendedAccountPublicKey,
      dispose: () => sessionPassphrase.fill(0),
    };
  } catch (error) {
    sessionPassphrase.fill(0);
    throw error;
  }
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
  const encryptedRootPrivateKeyBytes = ByteArray.fromHex(
    encryptedRootPrivateKey,
  );

  const keyAgent = new InMemoryKeyAgent(
    {
      accountIndex,
      chainId,
      encryptedRootPrivateKeyBytes: [...encryptedRootPrivateKeyBytes],
      extendedAccountPublicKey,
      getPassphrase: async () => authSecret,
      purpose: KeyPurpose.STANDARD,
    },
    {
      bip32Ed25519,
      logger: dummyLogger,
      rootPrivateKeyEncryption: SecretBox.isSealed(encryptedRootPrivateKeyBytes)
        ? { encrypt: SecretBox.seal, decrypt: SecretBox.open }
        : undefined,
    },
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
  extendedAccountPublicKey,
}: DeriveDRepKeyHashProps): Promise<Ed25519KeyHashHex> =>
  hashEd25519PublicKey(
    await deriveBip32PublicKey(extendedAccountPublicKey, KeyRole.DRep, 0),
  );

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
      scripts: context.scripts,
    });
  },
  signBlob: async (derivationPath, blob) =>
    keyAgent.signBlob(derivationPath, blob),
});
