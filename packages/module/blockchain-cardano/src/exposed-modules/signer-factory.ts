import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import {
  InMemoryKeyAgent,
  KeyPurpose,
  util,
} from '@cardano-sdk/key-management';
import { createInputResolver } from '@lace-contract/cardano-context';
import { ByteArray } from '@lace-sdk/util';
import { dummyLogger } from 'ts-log';

import { CardanoInMemorySignerFactory } from '../signing/cardano-in-memory-signer-factory';

import type {
  CardanoSignerFactory,
  CreateCardanoKeyAgent,
} from '@lace-contract/cardano-context';

const createInMemoryKeyAgentAdapter: CreateCardanoKeyAgent = async ({
  accountIndex,
  chainId,
  encryptedRootPrivateKey,
  extendedAccountPublicKey,
  authSecret,
}) => {
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

  return {
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
  };
};

const initSignerFactory = (): CardanoSignerFactory =>
  new CardanoInMemorySignerFactory({
    createKeyAgent: createInMemoryKeyAgentAdapter,
  });

export default initSignerFactory;
