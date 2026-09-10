import { Cardano } from '@cardano-sdk/core';
import { CardanoPaymentAddress } from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';
import { describe, expect, it, vi } from 'vitest';

import { chunkSweepPlan } from '../../../src/store/helpers/chunk-sweep-plan';

import type { SweepPlan } from '../../../src/store/helpers/build-sweep-tx';
import type { Serialization } from '@cardano-sdk/core';
import type {
  CardanoRewardAccount,
  RewardAccountInfo,
  RequiredProtocolParameters,
} from '@lace-contract/cardano-context';

const destinationAddress = CardanoPaymentAddress(
  'addr1qysyd4huaa8fppt5800gy6vjqacn29ce6vske9yz7mpvckajqlxgz8pdfj4uqfny4f72llspljpmvcx0wdsh8punfjzqwzpctq',
);

const sourceAddress = Cardano.PaymentAddress(
  'addr1q96l79jg5ahsrkfyrprs9eaaek0g0tfg3m4tln0vkmq29m8gnpz7wtsycpytk4tn3fe85fqhw7enll66ud9ex6yeu4wqgwfsph',
);

const utxoTxId = Cardano.TransactionId(
  '0dc01a6e652d0ca5078d01caab25cc8243850ed6545eff77cda17a2dd0bab60c',
);

const rewardAccount = Cardano.RewardAccount(
  'stake1uxpdrerp9wrxunfh6ukyv5267j70fzxgw0fr3z8zeac5vyqhf9jhy',
) as unknown as CardanoRewardAccount;

const protocolParameters: RequiredProtocolParameters = {
  coinsPerUtxoByte: 4310,
  collateralPercentage: 150,
  desiredNumberOfPools: 500,
  dRepDeposit: 500_000_000,
  maxCollateralInputs: 3,
  maxTxSize: 16384,
  maxValueSize: 5000,
  minFeeCoefficient: 44,
  minFeeConstant: 155381,
  minFeeRefScriptCostPerByte: '15.0',
  monetaryExpansion: '3.0/1000.0',
  poolDeposit: 500_000_000,
  poolInfluence: '3.0/10.0',
  prices: { memory: 0.0577, steps: 0.0000721 },
  stakeKeyDeposit: 2_000_000,
};

const createUtxo = (coins: bigint, index = 0): Cardano.Utxo =>
  [
    { txId: utxoTxId, index },
    { address: sourceAddress, value: { coins } },
  ] as Cardano.Utxo;

const emptyRewardInfos: (RewardAccountInfo & {
  rewardAccount: CardanoRewardAccount;
})[] = [];

const rewardInfos: (RewardAccountInfo & {
  rewardAccount: CardanoRewardAccount;
})[] = [
  {
    rewardAccount,
    isActive: true,
    isRegistered: true,
    rewardsSum: BigNumber(1_500_000n),
    withdrawableAmount: BigNumber(1_500_000n),
    controlledAmount: BigNumber(1_500_000n),
  } as RewardAccountInfo & { rewardAccount: CardanoRewardAccount },
];

const mockTx = {
  toCbor: () => 'aa'.repeat(500),
  toCore: () => ({ body: { fee: 200_000n } }),
} as unknown as Serialization.Transaction;

const buildTxFunction = vi.fn(async (_plan: SweepPlan) => mockTx);

/** Returns a size within the limit. */
const smallEstimate = () => 500;
/** Returns a size above the limit. */
const largeEstimate = () => 20_000;

describe('chunkSweepPlan', () => {
  it('returns a single chunk when all UTxOs fit in one tx', async () => {
    const utxos = [createUtxo(5_000_000n, 0), createUtxo(3_000_000n, 1)];
    const result = await chunkSweepPlan({
      utxos,
      rewardInfos: emptyRewardInfos,
      protocolParameters,
      networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
      destinationAddress,
      buildTxFunction,
      estimateSize: smallEstimate,
    });

    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(0);
    expect(result[0].isLastChunk).toBe(true);
    expect(result[0].rewardInfos).toEqual(emptyRewardInfos);
  });

  it('sorts UTxOs descending by coin value (SR-8a)', async () => {
    const utxos = [
      createUtxo(1_000_000n, 0),
      createUtxo(5_000_000n, 1),
      createUtxo(3_000_000n, 2),
    ];
    const result = await chunkSweepPlan({
      utxos,
      rewardInfos: emptyRewardInfos,
      protocolParameters,
      networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
      destinationAddress,
      buildTxFunction,
      estimateSize: smallEstimate,
    });

    const coins = result[0].utxos.map(u => u[1].value.coins);
    expect(coins).toEqual([5_000_000n, 3_000_000n, 1_000_000n]);
  });

  it('splits into multiple chunks when single tx exceeds maxTxSize', async () => {
    // Size proportional to UTxO count: >2 UTxOs exceeds the limit.
    const estimateSize = (_tx: unknown, utxos: Cardano.Utxo[]) =>
      utxos.length > 2 ? 20_000 : 500;

    const utxos = [
      createUtxo(5_000_000n, 0),
      createUtxo(4_000_000n, 1),
      createUtxo(3_000_000n, 2),
    ];

    const result = await chunkSweepPlan({
      utxos,
      rewardInfos,
      protocolParameters,
      networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
      destinationAddress,
      buildTxFunction,
      estimateSize,
    });

    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result.slice(0, -1)) {
      expect(chunk.rewardInfos).toEqual([]);
      expect(chunk.isLastChunk).toBe(false);
    }
    const lastChunk = result[result.length - 1];
    expect(lastChunk.rewardInfos).toEqual(rewardInfos);
    expect(lastChunk.isLastChunk).toBe(true);
  });

  it('assigns rewards only to the final chunk', async () => {
    // >1 UTxO exceeds the limit, forcing each into its own chunk.
    const estimateSize = (_tx: unknown, utxos: Cardano.Utxo[]) =>
      utxos.length > 1 ? 20_000 : 500;

    const utxos = [createUtxo(5_000_000n, 0), createUtxo(3_000_000n, 1)];
    const result = await chunkSweepPlan({
      utxos,
      rewardInfos,
      protocolParameters,
      networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
      destinationAddress,
      buildTxFunction,
      estimateSize,
    });

    expect(result).toHaveLength(2);
    expect(result[0].rewardInfos).toEqual([]);
    expect(result[1].rewardInfos).toEqual(rewardInfos);
  });

  it('throws when a single UTxO exceeds maxTxSize', async () => {
    await expect(
      chunkSweepPlan({
        utxos: [createUtxo(5_000_000n, 0)],
        rewardInfos: emptyRewardInfos,
        protocolParameters,
        networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
        destinationAddress,
        buildTxFunction,
        estimateSize: largeEstimate,
      }),
    ).rejects.toThrow();
  });

  it('throws when UTxOs array is empty', async () => {
    await expect(
      chunkSweepPlan({
        utxos: [],
        rewardInfos: emptyRewardInfos,
        protocolParameters,
        networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
        destinationAddress,
        buildTxFunction,
        estimateSize: smallEstimate,
      }),
    ).rejects.toThrow('Cannot chunk an empty UTxO set');
  });

  it('each chunk has at least one UTxO', async () => {
    const estimateSize = (_tx: unknown, utxos: Cardano.Utxo[]) =>
      utxos.length > 1 ? 20_000 : 500;

    const utxos = [
      createUtxo(5_000_000n, 0),
      createUtxo(4_000_000n, 1),
      createUtxo(3_000_000n, 2),
    ];
    const result = await chunkSweepPlan({
      utxos,
      rewardInfos: emptyRewardInfos,
      protocolParameters,
      networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
      destinationAddress,
      buildTxFunction,
      estimateSize,
    });

    for (const chunk of result) {
      expect(chunk.utxos.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('peels UTxOs from the final chunk when rewards push it over maxTxSize', async () => {
    // Size model: 5000 per UTxO + 5000 for rewards. With maxTxSize 16384,
    // 3 UTxOs without rewards (15000) fit but 3 + rewards (20000) don't.
    // The fix should peel 1 UTxO so the last chunk has 2 + rewards (15000).
    const sizedBuildTx = vi.fn(async (plan: SweepPlan) => ({
      toCbor: () => 'aa'.repeat(500),
      toCore: () => ({ body: { fee: 200_000n } }),
      utxoCount: plan.utxos.length,
      hasRewards: plan.rewardInfos.length > 0,
    })) as unknown as (plan: SweepPlan) => Promise<Serialization.Transaction>;

    const rewardAwareEstimate = (tx: Serialization.Transaction) => {
      const { utxoCount, hasRewards } = tx as unknown as {
        utxoCount: number;
        hasRewards: boolean;
      };
      return utxoCount * 5000 + (hasRewards ? 5000 : 0);
    };

    const utxos = [
      createUtxo(6_000_000n, 0),
      createUtxo(5_000_000n, 1),
      createUtxo(4_000_000n, 2),
      createUtxo(3_000_000n, 3),
      createUtxo(2_000_000n, 4),
      createUtxo(1_000_000n, 5),
    ];

    const result = await chunkSweepPlan({
      utxos,
      rewardInfos,
      protocolParameters,
      networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
      destinationAddress,
      buildTxFunction: sizedBuildTx,
      estimateSize: rewardAwareEstimate,
    });

    expect(result).toHaveLength(3);
    expect(result[0].utxos).toHaveLength(3);
    expect(result[0].rewardInfos).toEqual([]);
    // Spillover chunk: peeled UTxO(s), no rewards.
    expect(result[1].utxos).toHaveLength(1);
    expect(result[1].rewardInfos).toEqual([]);
    // Last chunk: reduced set, with rewards.
    expect(result[2].utxos).toHaveLength(2);
    expect(result[2].rewardInfos).toEqual(rewardInfos);
    expect(result[2].isLastChunk).toBe(true);
    // All UTxOs accounted for.
    expect(result.flatMap(chunk => chunk.utxos)).toHaveLength(6);
  });

  it('extends spillover when initial peel produces unbuildable chunk', async () => {
    // Same size model as above, but buildTx throws when total coin
    // value is below 4M (simulates fee + min-ADA floor). After the
    // size peel (pop removes smallest: 1M), spillover=[1M] can't
    // balance. The rebalance shifts the largest remaining (3M) from
    // the rewards chunk into spillover so it can cover fees.
    const MIN_BALANCE = 4_000_000n;

    const sizedBuildTx = vi.fn(async (plan: SweepPlan) => {
      const totalCoins = plan.utxos.reduce(
        (sum, u) => sum + u[1].value.coins,
        0n,
      );
      if (plan.rewardInfos.length === 0 && totalCoins < MIN_BALANCE) {
        throw new Error('InputSelectionError: insufficient funds');
      }
      return {
        toCbor: () => 'aa'.repeat(500),
        toCore: () => ({ body: { fee: 200_000n } }),
        utxoCount: plan.utxos.length,
        hasRewards: plan.rewardInfos.length > 0,
      };
    }) as unknown as (plan: SweepPlan) => Promise<Serialization.Transaction>;

    const rewardAwareEstimate = (tx: Serialization.Transaction) => {
      const { utxoCount, hasRewards } = tx as unknown as {
        utxoCount: number;
        hasRewards: boolean;
      };
      return utxoCount * 5000 + (hasRewards ? 5000 : 0);
    };

    const utxos = [
      createUtxo(6_000_000n, 0),
      createUtxo(5_000_000n, 1),
      createUtxo(4_000_000n, 2),
      createUtxo(3_000_000n, 3),
      createUtxo(2_000_000n, 4),
      createUtxo(1_000_000n, 5),
    ];

    const result = await chunkSweepPlan({
      utxos,
      rewardInfos,
      protocolParameters,
      networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
      destinationAddress,
      buildTxFunction: sizedBuildTx,
      estimateSize: rewardAwareEstimate,
    });

    expect(result).toHaveLength(3);
    expect(result[0].utxos).toHaveLength(3);
    expect(result[0].rewardInfos).toEqual([]);
    // Spillover expanded to include enough value to cover fee + min-ADA.
    expect(result[1].utxos).toHaveLength(2);
    expect(result[1].rewardInfos).toEqual([]);
    expect(result[2].utxos).toHaveLength(1);
    expect(result[2].rewardInfos).toEqual(rewardInfos);
    expect(result[2].isLastChunk).toBe(true);
    expect(result.flatMap(chunk => chunk.utxos)).toHaveLength(6);
  });

  it('does not starve the rewards chunk when multiple size peels are needed', async () => {
    // Size model: 3000 per UTxO + 8000 for rewards. With maxTxSize 16384,
    // 2 UTxOs + rewards (14000) fit, but 3+ don't. The greedy partition
    // produces one chunk [5M, 4M, 0.3M, 0.2M, 0.1M]. Popping the three
    // smallest for size leaves [5M, 4M] with rewards (balanceable).
    // Spillover [0.3M, 0.2M, 0.1M] can't cover the 2M fee floor, so the
    // rebalance shifts 5M into spillover without starving the last chunk.
    const MIN_BALANCE = 2_000_000n;

    const sizedBuildTx = vi.fn(async (plan: SweepPlan) => {
      const utxoCoins = plan.utxos.reduce(
        (sum, u) => sum + u[1].value.coins,
        0n,
      );
      const rewardCoins = plan.rewardInfos.length > 0 ? 1_500_000n : 0n;
      if (utxoCoins + rewardCoins < MIN_BALANCE) {
        throw new Error('InputSelectionError: insufficient funds');
      }
      return {
        toCbor: () => 'aa'.repeat(500),
        toCore: () => ({ body: { fee: 200_000n } }),
        utxoCount: plan.utxos.length,
        hasRewards: plan.rewardInfos.length > 0,
      };
    }) as unknown as (plan: SweepPlan) => Promise<Serialization.Transaction>;

    const rewardAwareEstimate = (tx: Serialization.Transaction) => {
      const { utxoCount, hasRewards } = tx as unknown as {
        utxoCount: number;
        hasRewards: boolean;
      };
      return utxoCount * 3000 + (hasRewards ? 8000 : 0);
    };

    const utxos = [
      createUtxo(5_000_000n, 0),
      createUtxo(4_000_000n, 1),
      createUtxo(300_000n, 2),
      createUtxo(200_000n, 3),
      createUtxo(100_000n, 4),
    ];

    const result = await chunkSweepPlan({
      utxos,
      rewardInfos,
      protocolParameters,
      networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
      destinationAddress,
      buildTxFunction: sizedBuildTx,
      estimateSize: rewardAwareEstimate,
    });

    expect(result).toHaveLength(2);
    // Spillover: dust + shifted 5M for buildability.
    expect(result[0].utxos).toHaveLength(4);
    expect(result[0].rewardInfos).toEqual([]);
    // Last chunk: single UTxO + rewards.
    expect(result[1].utxos).toHaveLength(1);
    expect(result[1].rewardInfos).toEqual(rewardInfos);
    expect(result[1].isLastChunk).toBe(true);
    expect(result.flatMap(chunk => chunk.utxos)).toHaveLength(5);
  });

  it('throws when even a single UTxO with rewards exceeds maxTxSize', async () => {
    // 8000 per UTxO + 10000 for rewards. Even 1 UTxO + rewards = 18000 > 16384.
    const sizedBuildTx = vi.fn(async (plan: SweepPlan) => ({
      toCbor: () => 'aa'.repeat(500),
      toCore: () => ({ body: { fee: 200_000n } }),
      utxoCount: plan.utxos.length,
      hasRewards: plan.rewardInfos.length > 0,
    })) as unknown as (plan: SweepPlan) => Promise<Serialization.Transaction>;

    const rewardAwareEstimate = (tx: Serialization.Transaction) => {
      const { utxoCount, hasRewards } = tx as unknown as {
        utxoCount: number;
        hasRewards: boolean;
      };
      return utxoCount * 8000 + (hasRewards ? 10000 : 0);
    };

    await expect(
      chunkSweepPlan({
        utxos: [
          createUtxo(5_000_000n, 0),
          createUtxo(3_000_000n, 1),
          createUtxo(1_000_000n, 2),
        ],
        rewardInfos,
        protocolParameters,
        networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
        destinationAddress,
        buildTxFunction: sizedBuildTx,
        estimateSize: rewardAwareEstimate,
      }),
    ).rejects.toThrow('Final chunk with rewards exceeds maxTxSize');
  });

  it('chunk indexes are sequential', async () => {
    const estimateSize = (_tx: unknown, utxos: Cardano.Utxo[]) =>
      utxos.length > 1 ? 20_000 : 500;

    const utxos = [
      createUtxo(5_000_000n, 0),
      createUtxo(4_000_000n, 1),
      createUtxo(3_000_000n, 2),
    ];
    const result = await chunkSweepPlan({
      utxos,
      rewardInfos: emptyRewardInfos,
      protocolParameters,
      networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
      destinationAddress,
      buildTxFunction,
      estimateSize,
    });

    result.forEach((chunk, index) => {
      expect(chunk.index).toBe(index);
    });
  });
});
