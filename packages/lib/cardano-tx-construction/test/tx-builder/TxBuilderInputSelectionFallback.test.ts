import { Cardano } from '@lace-lib/cardano-core';
import * as Crypto from '@lace-lib/cardano-crypto';
import {
  GreedyInputSelector,
  InputSelectionError,
  InputSelectionFailure,
  LargeFirstSelector,
  roundRobinRandomImprove,
} from '@lace-lib/cardano-input-selection';
import {
  AddressType,
  Bip32Account,
  InMemoryKeyAgent,
  util,
} from '@lace-lib/cardano-key-management';
import { mockProviders as mocks } from '@lace-lib/cardano-util-dev';
import uniqBy from 'lodash/uniqBy.js';
import { dummyLogger } from 'ts-log';

import { GenericTxBuilder } from '../../src';

import { mockTxEvaluator } from './mocks';

import type {
  OutputValidation,
  RewardAccountWithPoolId,
  TxBuilderProviders,
} from '../../src';
import type { GroupedAddress } from '@lace-lib/cardano-key-management';
import type { Mock, Mocked } from 'vitest';

const largeFirstSelectSpy = vi.spyOn(LargeFirstSelector.prototype, 'select');

vi.mock('@lace-lib/cardano-input-selection', async () => {
  const actual = await vi.importActual<any>(
    '@lace-lib/cardano-input-selection',
  );
  return {
    ...actual,
    roundRobinRandomImprove: vi.fn(args =>
      actual.roundRobinRandomImprove(args),
    ),
  };
});

const inputResolver: Cardano.InputResolver = {
  resolveInput: async txIn =>
    mocks.utxo.find(
      ([hydratedTxIn]) =>
        txIn.txId === hydratedTxIn.txId && txIn.index === hydratedTxIn.index,
    )?.[1] || null,
};

/** Utility factory for tests to create a GenericTxBuilder with mocked dependencies */
const createTxBuilder = async ({
  adjustRewardAccount = r => r,
  stakeDelegations,
  numAddresses = stakeDelegations.length,
  useMultiplePaymentKeys = false,
  rewardAccounts,
  keyAgent,
}: {
  adjustRewardAccount?: (
    rewardAccountWithPoolId: RewardAccountWithPoolId,
    index: number,
  ) => RewardAccountWithPoolId;
  stakeDelegations: {
    credentialStatus: Cardano.StakeCredentialStatus;
    poolId?: Cardano.PoolId;
    deposit?: Cardano.Lovelace;
  }[];
  numAddresses?: number;
  useMultiplePaymentKeys?: boolean;

  rewardAccounts?: any;
  keyAgent: InMemoryKeyAgent;
}) => {
  let groupedAddresses = await Promise.all(
    Array.from({ length: numAddresses }).map(async (_, idx) =>
      keyAgent.deriveAddress({ index: 0, type: AddressType.External }, idx),
    ),
  );

  // Simulate an HD wallet where a each stake key partitions 2 payment keys (2 addresses per stake key)
  if (useMultiplePaymentKeys) {
    const groupedAddresses2 = await Promise.all(
      stakeDelegations.map(async (_, idx) =>
        keyAgent.deriveAddress({ index: 1, type: AddressType.External }, idx),
      ),
    );
    groupedAddresses = [...groupedAddresses, ...groupedAddresses2];
  }

  const txBuilderProviders: Mocked<TxBuilderProviders> = {
    addresses: {
      add: vi
        .fn()
        .mockImplementation((...addreses) =>
          groupedAddresses.push(...addreses),
        ),
      get: vi.fn().mockResolvedValue(groupedAddresses),
    },
    genesisParameters: vi.fn().mockResolvedValue(mocks.genesisParameters),
    protocolParameters: vi.fn().mockResolvedValue(mocks.protocolParameters),
    rewardAccounts:
      rewardAccounts ||
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          // There can be multiple addresses with the same reward account. Extract the uniq reward accounts
          uniqBy(groupedAddresses, ({ rewardAccount }) => rewardAccount)
            // Create mock stakeKey/delegation status for each reward account according to the requested stakeDelegations.
            // This would normally be done by the wallet.delegation.rewardAccounts
            .map<RewardAccountWithPoolId>(
              ({ rewardAccount: address }, index) => {
                const { credentialStatus, poolId, deposit } =
                  stakeDelegations[index] ?? {};
                return adjustRewardAccount(
                  {
                    address,
                    credentialStatus:
                      credentialStatus ??
                      Cardano.StakeCredentialStatus.Unregistered,
                    dRepDelegatee: {
                      delegateRepresentative: {
                        __typename: 'AlwaysAbstain',
                      },
                    },
                    rewardBalance: mocks.rewardAccountBalance,
                    ...(poolId
                      ? { delegatee: { nextNextEpoch: { id: poolId } } }
                      : undefined),
                    ...(deposit && { deposit }),
                  },
                  index,
                );
              },
            ),
        ),
      ),
    tip: vi.fn().mockResolvedValue(mocks.ledgerTip),
    utxoAvailable: vi.fn().mockResolvedValue(mocks.utxo),
  };
  const outputValidator = {
    validateOutput: vi
      .fn()
      .mockResolvedValue({ coinMissing: 0n } as OutputValidation),
  };
  const asyncKeyAgent = util.createAsyncKeyAgent(keyAgent);
  return {
    groupedAddresses,
    txBuilder: new GenericTxBuilder({
      bip32Account: await Bip32Account.fromAsyncKeyAgent(asyncKeyAgent),
      inputResolver,
      logger: dummyLogger,
      outputValidator,
      txBuilderProviders,
      txEvaluator: mockTxEvaluator,
      witnesser: util.createBip32Ed25519Witnesser(asyncKeyAgent),
    }),
    txBuilderProviders,
    txBuilderWithoutBip32Account: new GenericTxBuilder({
      inputResolver,
      logger: dummyLogger,
      outputValidator,
      txBuilderProviders,
      txEvaluator: mockTxEvaluator,
      witnesser: util.createBip32Ed25519Witnesser(asyncKeyAgent),
    }),
  };
};

describe('TxBuilder/inputSelectorFallback', () => {
  let txBuilder: GenericTxBuilder;
  let keyAgent: InMemoryKeyAgent;
  let groupedAddresses: GroupedAddress[];

  beforeEach(async () => {
    keyAgent = await InMemoryKeyAgent.fromBip39MnemonicWords(
      {
        chainId: Cardano.ChainIds.Preprod,
        getPassphrase: async () => Buffer.from('passphrase'),
        mnemonicWords: util.generateMnemonicWords(),
      },
      {
        bip32Ed25519: await Crypto.SodiumBip32Ed25519.create(),
        logger: dummyLogger,
      },
    );

    const txBuilderFactory = await createTxBuilder({
      keyAgent,
      stakeDelegations: [
        { credentialStatus: Cardano.StakeCredentialStatus.Unregistered },
      ],
    });
    txBuilder = txBuilderFactory.txBuilder;
    groupedAddresses = txBuilderFactory.groupedAddresses;
  });

  afterEach(() => vi.clearAllMocks());

  it('uses random improve by default', async () => {
    const tx = await txBuilder.addOutput(mocks.utxo[0][1]).build().inspect();

    expect(tx.inputSelection.inputs.size).toBeGreaterThan(0);
    expect(tx.inputSelection.outputs.size).toBe(1);
    expect(tx.inputSelection.change.length).toBeGreaterThan(0);
    expect(roundRobinRandomImprove).toHaveBeenCalled();
    expect(largeFirstSelectSpy).not.toHaveBeenCalled();
  });

  const fallbackFailures = [
    InputSelectionFailure.MaximumInputCountExceeded,
    InputSelectionFailure.UtxoFullyDepleted,
    InputSelectionFailure.UtxoNotFragmentedEnough,
  ] as const;

  it.each(fallbackFailures)(
    'falls back to large first when random improve throws',
    async failure => {
      (roundRobinRandomImprove as Mock).mockImplementationOnce(() => {
        throw new InputSelectionError(failure);
      });

      const tx = await txBuilder.addOutput(mocks.utxo[0][1]).build().inspect();

      expect(tx.inputSelection.inputs.size).toBeGreaterThan(0);
      expect(tx.inputSelection.outputs.size).toBe(1);
      expect(tx.inputSelection.change.length).toBeGreaterThan(0);

      expect(roundRobinRandomImprove).toHaveBeenCalled();
      expect(largeFirstSelectSpy).toHaveBeenCalled();
    },
  );

  it.each(fallbackFailures)(
    'only retries once with large first when random improve throws %s',
    async failure => {
      (roundRobinRandomImprove as Mock).mockImplementationOnce(() => {
        throw new InputSelectionError(failure);
      });

      largeFirstSelectSpy.mockImplementationOnce(async () => {
        throw new InputSelectionError(failure);
      });

      await expect(
        txBuilder.addOutput(mocks.utxo[0][1]).build().inspect(),
      ).rejects.toThrow(failure);
      expect(roundRobinRandomImprove).toHaveBeenCalledTimes(1);
      expect(largeFirstSelectSpy).toHaveBeenCalledTimes(1);
    },
  );

  it('does not fallback to large first when random improve throws UtxoBalanceInsufficient input selection error', async () => {
    (roundRobinRandomImprove as Mock).mockImplementationOnce(() => {
      throw new InputSelectionError(
        InputSelectionFailure.UtxoBalanceInsufficient,
      );
    });

    await expect(
      txBuilder.addOutput(mocks.utxo[0][1]).build().inspect(),
    ).rejects.toThrow('UTxO Balance Insufficient');
    expect(roundRobinRandomImprove).toHaveBeenCalled();
    expect(largeFirstSelectSpy).not.toHaveBeenCalled();
  });

  it('does not fallback to large first when using greedy input selector', async () => {
    const poolIds: Cardano.PoolId[] = [
      Cardano.PoolId(
        'pool1zuevzm3xlrhmwjw87ec38mzs02tlkwec9wxpgafcaykmwg7efhh',
      ),
      Cardano.PoolId(
        'pool1t9xlrjyk76c96jltaspgwcnulq6pdkmhnge8xgza8ku7qvpsy9r',
      ),
    ];

    vi.spyOn(GreedyInputSelector.prototype, 'select').mockImplementationOnce(
      async () => {
        throw new InputSelectionError(
          InputSelectionFailure.MaximumInputCountExceeded,
        );
      },
    );

    const output = {
      address: groupedAddresses[0].address,
      value: { coins: 10n },
    };
    await expect(
      txBuilder
        .delegatePortfolio({
          name: 'Tests Portfolio',
          pools: [
            {
              id: Cardano.PoolIdHex(Cardano.PoolId.toKeyHash(poolIds[0])),
              weight: 1,
            },
            {
              id: Cardano.PoolIdHex(Cardano.PoolId.toKeyHash(poolIds[1])),
              weight: 2,
            },
          ],
        })
        .addOutput(txBuilder.buildOutput(output).toTxOut())
        .build()
        .inspect(),
    ).rejects.toThrow('Maximum Input Count Exceeded');
    expect(roundRobinRandomImprove).not.toHaveBeenCalled();
    expect(largeFirstSelectSpy).not.toHaveBeenCalled();
  });
});
