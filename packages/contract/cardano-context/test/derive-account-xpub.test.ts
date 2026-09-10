import { Cardano } from '@cardano-sdk/core';
import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import {
  InMemoryKeyAgent,
  KeyPurpose,
  util,
} from '@cardano-sdk/key-management';
import { SecretBox } from '@lace-lib/core';
import { HexBytes } from '@lace-lib/util';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import { deriveAccountExtendedPublicKey } from '../src/signing/derive-account-xpub';

import type { SerializableInMemoryKeyAgentData } from '@cardano-sdk/key-management';
import type { AuthSecret } from '@lace-contract/authentication-prompt';

const inMemoryData = (
  agent: InMemoryKeyAgent,
): SerializableInMemoryKeyAgentData =>
  agent.serializableData as SerializableInMemoryKeyAgentData;

const chainId = Cardano.ChainIds.Preprod;

// Build an import-time key agent (the same path source import uses) so we can
// golden the scan's derivation against what import itself would produce.
const buildAgent = async (
  accountIndex: number,
  passphrase: Uint8Array,
  mnemonicWords: string[],
) => {
  const bip32Ed25519 = await SodiumBip32Ed25519.create();
  return InMemoryKeyAgent.fromBip39MnemonicWords(
    {
      accountIndex,
      chainId,
      getPassphrase: async () => passphrase,
      mnemonicWords,
      purpose: KeyPurpose.STANDARD,
    },
    { bip32Ed25519, logger: dummyLogger },
  );
};

const encryptedRootOf = (agent: InMemoryKeyAgent): HexBytes =>
  HexBytes(
    Buffer.from(inMemoryData(agent).encryptedRootPrivateKeyBytes).toString(
      'hex',
    ),
  );

describe('deriveAccountExtendedPublicKey', () => {
  it('reproduces the account-0 xpub the import-time key agent derives', async () => {
    const mnemonicWords = util.generateMnemonicWords();
    const passphrase = new Uint8Array(32).fill(7);
    const agent0 = await buildAgent(0, passphrase, mnemonicWords);

    const derived = await deriveAccountExtendedPublicKey({
      encryptedRootPrivateKey: encryptedRootOf(agent0),
      accountIndex: 0,
      authSecret: passphrase as AuthSecret,
    });

    expect(derived).toBe(inMemoryData(agent0).extendedAccountPublicKey);
  });

  it('derives distinct per-index xpubs, matching the agent at index 1', async () => {
    const mnemonicWords = util.generateMnemonicWords();
    const passphrase = new Uint8Array(32).fill(9);
    const agent0 = await buildAgent(0, passphrase, mnemonicWords);
    const agent1 = await buildAgent(1, passphrase, mnemonicWords);

    // Derive index 1 from account 0's encrypted root: same plaintext root, so it
    // must match the agent built directly at index 1, and differ from index 0.
    const derived1 = await deriveAccountExtendedPublicKey({
      encryptedRootPrivateKey: encryptedRootOf(agent0),
      accountIndex: 1,
      authSecret: passphrase as AuthSecret,
    });

    expect(derived1).toBe(inMemoryData(agent1).extendedAccountPublicKey);
    expect(derived1).not.toBe(inMemoryData(agent0).extendedAccountPublicKey);
  });

  it('zeroes the decrypted root bytes after deriving (SR-5)', async () => {
    const mnemonicWords = util.generateMnemonicWords();
    const passphrase = new Uint8Array(32).fill(5);
    const agent0 = await buildAgent(0, passphrase, mnemonicWords);

    // Capture the SAME buffer SecretBox.open returns, let the real derive run,
    // then assert the helper wiped it in its finally block.
    let rootBytes: Uint8Array | undefined;
    const open = SecretBox.open.bind(SecretBox);
    const spy = vi
      .spyOn(SecretBox, 'open')
      .mockImplementation(async (box, secret) => {
        rootBytes = await open(box, secret);
        return rootBytes;
      });

    await deriveAccountExtendedPublicKey({
      encryptedRootPrivateKey: encryptedRootOf(agent0),
      accountIndex: 0,
      authSecret: passphrase as AuthSecret,
    });
    spy.mockRestore();

    expect(rootBytes).toBeDefined();
    expect((rootBytes as Uint8Array).every(byte => byte === 0)).toBe(true);
  });
});
