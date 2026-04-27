import {
  Cardano,
  createTxInspector,
  transactionSummaryInspector,
} from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { TokenId } from '@lace-contract/tokens';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber, Timestamp } from '@lace-sdk/util';
import { firstValueFrom, of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { assetProvider } from '../../../src/store/helpers/get-fallback-asset';
import { mapTransactionToActivity } from '../../../src/store/helpers/map-transaction-to-activity';
import {
  CardanoRewardAccount,
  CardanoPaymentAddress,
} from '../../../src/types';

import type {
  ExtendedTxDetails,
  RequiredProtocolParameters,
} from '../../../src/types';
import type * as Core from '@cardano-sdk/core';

const logger = dummyLogger;

// Mock the Cardano SDK functions
vi.mock('@cardano-sdk/core', async importActual => {
  const module = await importActual<typeof Core>();

  return {
    Cardano: {
      ...module.Cardano,
      AssetId: {
        getPolicyId: vi.fn(),
        getAssetName: vi.fn(),
      },
      AssetFingerprint: {
        fromParts: vi.fn(),
      },
      BlockNo: vi.fn(),
      BlockId: vi.fn(),
      Slot: vi.fn(),
    },
    createTxInspector: vi.fn(),
    transactionSummaryInspector: vi.fn(),
  };
});

describe('mapTransactionToActivity', () => {
  const mockTxId =
    '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2';
  const mockBlockTime = 1640995200; // 2022-01-01 00:00:00 UTC
  const mockAccountAddresses = [
    'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
  ];
  const mockRewardAccount =
    'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj';

  // Simplified mock protocol parameters
  const mockProtocolParameters = {
    coinsPerUtxoByte: 4310,
    maxValueSize: 5000,
    maxTxSize: 16384,
    maxTxExUnits: { memory: 14000000, steps: 10000000000 },
    maxBlockExUnits: { memory: 62000000, steps: 20000000000 },
    maxBlockHeaderSize: 1100,
    maxBlockBodySize: 90112,
    maxCollateralInputs: 3,
    poolDeposit: 500000000,
    desiredNumberOfPools: 500,
    collateralPercentage: 150,
    poolInfluence: '0.5',
    dRepDeposit: 500000000,
    keyDeposit: 2000000,
    minFeeCoefficient: 44,
    minFeeConstant: 155381,
    minUtxoValue: 1000000,
    minPoolCost: 340000000,
    plutusScriptVersion: 1,
    maxEpoch: 18,
    maxMajorProtocolVersion: 8,
    maxLovelaceSupply: 45000000000000000,
    stakeKeyDeposit: 2000000,
    stakePoolPledgeInfluence: 0.3,
    monetaryExpansion: '0.003',
    treasuryExpansion: 0.2,
    decentralizationParameter: 0.0,
    extraEntropy: null,
    protocolVersion: { major: 8, minor: 0 },
    costModels: new Map(),
    executionUnitPrices: { memory: 0.0577, steps: 0.0000721 },
    maxTxExecutionUnits: { memory: 14000000n, steps: 10000000000n },
    maxBlockExecutionUnits: { memory: 62000000n, steps: 20000000000n },
    prices: { memory: 0.0577, steps: 0.0000721 },
  } as RequiredProtocolParameters;

  const mockResolveInput = vi.fn();

  const mockTxDetails: ExtendedTxDetails = {
    id: Cardano.TransactionId(mockTxId),
    blockTime: mockBlockTime,
    body: {
      inputs: [],
      outputs: [],
      fee: 1000000n,
      validityInterval: {
        invalidBefore: undefined,
        invalidHereafter: undefined,
      },
      certificates: [],
      withdrawals: [],
      mint: undefined,
      collateralReturn: undefined,
      collaterals: [],
      totalCollateral: undefined,
      proposalProcedures: undefined,
      votingProcedures: undefined,
    },
    witness: {
      signatures: new Map(),
      scripts: [],
      datums: [],
      redeemers: [],
      bootstrap: [],
    },
    auxiliaryData: undefined,
    blockHeader: {
      blockNo: Cardano.BlockNo(1000),
      hash: Cardano.BlockId(
        '0000000000000000000000000000000000000000000000000000000000000001',
      ),
      slot: Cardano.Slot(1000000),
    },
    index: 0,
    inputSource: Cardano.InputSource.inputs,
    txSize: 1000,
  };

  const mockTxSummaryInspector = vi.fn();
  const mockCreateTxInspector = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateTxInspector.mockReturnValue(mockTxSummaryInspector);
    (
      createTxInspector as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(mockCreateTxInspector);
    (
      transactionSummaryInspector as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({});
  });

  describe('mapTransactionToActivity', () => {
    it('should create tx inspector with correct configuration', () => {
      const mockSummary = {
        coins: 1000000n,
        assets: new Map([
          ['asset123', { amount: 100n }],
          ['asset456', { amount: 200n }],
        ]),
      };
      (
        transactionSummaryInspector as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockSummary);
      const mockTxInspector = {
        summary: mockSummary,
      };
      mockTxSummaryInspector.mockReturnValue(of(mockTxInspector));
      mapTransactionToActivity({
        accountId: AccountId('account1'),
        txDetails: mockTxDetails,
        accountAddresses: mockAccountAddresses.map(addr =>
          CardanoPaymentAddress(addr),
        ),
        rewardAccount: CardanoRewardAccount(mockRewardAccount),
        protocolParameters: mockProtocolParameters,
        resolveInput: mockResolveInput,
        logger,
      });

      expect(transactionSummaryInspector).toHaveBeenCalledWith({
        addresses: mockAccountAddresses,
        rewardAccounts: [mockRewardAccount],
        inputResolver: {
          resolveInput: mockResolveInput,
        },
        protocolParameters: mockProtocolParameters,
        assetProvider: assetProvider,
        timeout: 10000,
        logger,
      });

      expect(createTxInspector).toHaveBeenCalledWith({
        summary: mockSummary,
      });
    });

    it('should return Ok with correct activity for receive transaction', async () => {
      const mockSummary = {
        coins: 1000000n,
        assets: new Map([
          ['asset123', { amount: 100n }],
          ['asset456', { amount: 200n }],
        ]),
      };

      mockTxSummaryInspector.mockReturnValue(of({ summary: mockSummary }));

      const result = await firstValueFrom(
        mapTransactionToActivity({
          accountId: AccountId('account1'),
          txDetails: mockTxDetails,
          accountAddresses: mockAccountAddresses.map(addr =>
            CardanoPaymentAddress(addr),
          ),
          rewardAccount: CardanoRewardAccount(mockRewardAccount),
          protocolParameters: mockProtocolParameters,
          resolveInput: mockResolveInput,
          logger,
        }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const activity = result.value;
        expect(activity).toEqual({
          accountId: AccountId('account1'),
          activityId: mockTxId,
          timestamp: Timestamp(mockBlockTime * 1000),
          tokenBalanceChanges: [
            { tokenId: TokenId('asset123'), amount: BigNumber(100n) },
            { tokenId: TokenId('asset456'), amount: BigNumber(200n) },
            { tokenId: TokenId('lovelace'), amount: BigNumber(1000000n) },
          ],
          type: ActivityType.Receive,
        });
      }
    });

    it('should return Ok with correct activity for send transaction', async () => {
      const mockSummary = {
        coins: -500000n,
        assets: new Map([['asset123', { amount: -50n }]]),
      };

      mockTxSummaryInspector.mockReturnValue(of({ summary: mockSummary }));

      const result = await firstValueFrom(
        mapTransactionToActivity({
          accountId: AccountId('account1'),
          txDetails: mockTxDetails,
          accountAddresses: mockAccountAddresses.map(addr =>
            CardanoPaymentAddress(addr),
          ),
          rewardAccount: CardanoRewardAccount(mockRewardAccount),
          protocolParameters: mockProtocolParameters,
          resolveInput: mockResolveInput,
          logger,
        }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const activity = result.value;
        expect(activity).toEqual({
          accountId: AccountId('account1'),
          activityId: mockTxId,
          timestamp: Timestamp(mockBlockTime * 1000),
          tokenBalanceChanges: [
            { tokenId: TokenId('asset123'), amount: BigNumber(-50n) },
            { tokenId: TokenId('lovelace'), amount: BigNumber(-500000n) },
          ],
          type: ActivityType.Send,
        });
      }
    });
  });
});
