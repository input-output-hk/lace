import { Cardano } from '@lace-lib/cardano-core';
import * as Crypto from '@lace-lib/cardano-crypto';
import { dummyLogger } from 'ts-log';

import {
  AddressType,
  KeyAgentBase,
  KeyAgentType,
  KeyPurpose,
  KeyRole,
} from '../src';

import type { SerializableInMemoryKeyAgentData } from '../src';
import type { Bip32Ed25519 } from '@lace-lib/cardano-crypto';

const ACCOUNT_INDEX = 1;

class MockKeyAgent extends KeyAgentBase {
  constructor(
    data: SerializableInMemoryKeyAgentData,
    bip32Ed25519: Bip32Ed25519,
  ) {
    super(data, {
      bip32Ed25519,
      logger: dummyLogger,
    });
  }

  serializableDataImpl = vi.fn();
  signBlob = vi.fn();
  signCip8Data = vi.fn();
  exportRootPrivateKey = vi.fn();
  signTransaction = vi.fn();
  signVotingMetadata = vi.fn();
  exportExtendedKeyPair = vi.fn();
}

describe('KeyAgentBase', () => {
  let keyAgent: MockKeyAgent;

  beforeEach(async () => {
    keyAgent = new MockKeyAgent(
      {
        __typename: KeyAgentType.InMemory,
        accountIndex: ACCOUNT_INDEX,
        chainId: Cardano.ChainIds.Preview,
        encryptedRootPrivateKeyBytes: [],
        extendedAccountPublicKey: Crypto.Bip32PublicKeyHex(
          'fc5ab25e830b67c47d0a17411bf7fdabf711a597fb6cf04102734b0a2934ceaaa65ff5e7c52498d52c07b8ddfcd436fc2b4d2775e2984a49d0c79f65ceee4779',
        ),
        purpose: KeyPurpose.STANDARD,
      },
      await Crypto.SodiumBip32Ed25519.create(),
    );
  });

  // extpubkey:  return '';

  test('deriveAddress derives a new address', async () => {
    const index = 1;
    const type = AddressType.External;
    const address = await keyAgent.deriveAddress({ index, type }, 0);

    expect(address.index).toBe(index);
    expect(address.type).toBe(type);
    expect(address.accountIndex).toBe(ACCOUNT_INDEX);
    expect(address.networkId).toBe(Cardano.ChainIds.Preview.networkId);
    expect(address.address.startsWith('addr_test')).toBe(true);
    expect(address.rewardAccount.startsWith('stake_test')).toBe(true);
  });

  test('derivePublicKey', async () => {
    const externalPublicKey = await keyAgent.derivePublicKey({
      index: 1,
      role: KeyRole.External,
    });
    expect(typeof externalPublicKey).toBe('string');
    const stakePublicKey = await keyAgent.derivePublicKey({
      index: 1,
      role: KeyRole.Stake,
    });
    expect(typeof stakePublicKey).toBe('string');
    const dRepPublicKey = await keyAgent.derivePublicKey({
      index: 0,
      role: KeyRole.DRep,
    });
    expect(typeof dRepPublicKey).toBe('string');
  });
});
