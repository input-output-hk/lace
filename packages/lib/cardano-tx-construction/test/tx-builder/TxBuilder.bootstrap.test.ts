import { Cardano } from '@lace-lib/cardano-core';
import { SodiumBip32Ed25519 } from '@lace-lib/cardano-crypto';
import {
  AddressType,
  Bip32Account,
  InMemoryKeyAgent,
  util,
} from '@lace-lib/cardano-key-management';
import { logger, mockProviders as mocks } from '@lace-lib/cardano-util-dev';
import { dummyLogger } from 'ts-log';

import { GenericTxBuilder } from '../../src';

import { mockTxEvaluator } from './mocks';

import type { OutputValidation, TxBuilderProviders } from '../../src';
import type { Mocked } from 'vitest';

describe.each([
  ['TxBuilderGeneric', false],
  ['TxBuilderGeneric - bip32Account', true],
])('%s', (_, useBip32Account) => {
  it('awaits for non-empty knownAddresses', async () => {
    // Initialize the TxBuilder
    const output = mocks.utxo[0][1];
    const rewardAccount = mocks.rewardAccount;
    const knownAddresses = [
      {
        accountIndex: 0,
        address: mocks.utxo[0][1].address,
        index: 0,
        networkId: Cardano.NetworkId.Testnet,
        rewardAccount,
        type: AddressType.External,
      },
    ];
    const inputResolver: Cardano.InputResolver = {
      resolveInput: async txIn =>
        mocks.utxo.find(
          ([hydratedTxIn]) =>
            txIn.txId === hydratedTxIn.txId &&
            txIn.index === hydratedTxIn.index,
        )?.[1] || null,
    };
    const keyAgent = util.createAsyncKeyAgent(
      await InMemoryKeyAgent.fromBip39MnemonicWords(
        {
          chainId: Cardano.ChainIds.Preview,
          getPassphrase: async () => Buffer.from([]),
          mnemonicWords: util.generateMnemonicWords(),
        },
        { bip32Ed25519: await SodiumBip32Ed25519.create(), logger },
      ),
    );
    const txBuilderProviders: Mocked<TxBuilderProviders> = {
      addresses: {
        add: vi.fn(),
        get: vi.fn().mockResolvedValue(knownAddresses),
      },
      genesisParameters: vi.fn().mockResolvedValue(mocks.genesisParameters),
      protocolParameters: vi.fn().mockResolvedValue(mocks.protocolParameters),
      rewardAccounts: vi.fn().mockResolvedValue([
        {
          address: rewardAccount,
          keyStatus: Cardano.StakeCredentialStatus.Unregistered,
          rewardBalance: mocks.rewardAccountBalance,
        },
      ]),
      tip: vi.fn().mockResolvedValue(mocks.ledgerTip),
      utxoAvailable: vi.fn().mockResolvedValue(mocks.utxo),
    };
    const outputValidator = {
      validateOutput: vi
        .fn()
        .mockResolvedValue({ coinMissing: 0n } as OutputValidation),
    };

    const builderParams = {
      bip32Account: useBip32Account
        ? await Bip32Account.fromAsyncKeyAgent(keyAgent)
        : undefined,
      inputResolver,
      logger: dummyLogger,
      outputValidator,
      txBuilderProviders,
      txEvaluator: mockTxEvaluator,
      witnesser: util.createBip32Ed25519Witnesser(keyAgent),
    };
    const txBuilder = new GenericTxBuilder(builderParams);

    // Build and sign a tx
    const signedTxReady = txBuilder.addOutput(output).build().sign();
    const signedTx = await signedTxReady;
    expect(signedTx.tx.witness.signatures.size).toBe(1);
  });
});
