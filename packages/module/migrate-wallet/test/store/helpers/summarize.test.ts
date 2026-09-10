import { BigNumber } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { summarize } from '../../../src/store/helpers/summarize';

import type { Cardano } from '@cardano-sdk/core';
import type {
  CardanoRewardAccount,
  RewardAccountInfo,
} from '@lace-contract/cardano-context';

type SummarizeRewardInfo = RewardAccountInfo & {
  rewardAccount: CardanoRewardAccount;
};

const rewardInfo = (isRegistered: boolean): SummarizeRewardInfo =>
  ({
    isActive: true,
    isRegistered,
    rewardsSum: BigNumber(0n),
    withdrawableAmount: BigNumber(0n),
    controlledAmount: BigNumber(0n),
    rewardAccount: 'stake_test1' as CardanoRewardAccount,
  } as SummarizeRewardInfo);

const summarizeWith = (rewardInfos: SummarizeRewardInfo[]) =>
  summarize({
    utxos: [] as Cardano.Utxo[],
    rewardInfos,
    estimatedFee: 0n,
    sweptAccountCount: rewardInfos.length,
    scannedThroughAccountIndex: 0,
    scriptUtxoCount: 0,
    chunkCount: 1,
    protocolParameters: { stakeKeyDeposit: 2_000_000 },
  });

describe('summarize', () => {
  it('sums coins across UTxOs and ADDS quantities of the same asset, sorted by id', () => {
    // The same asset in two UTxOs must add, not overwrite — an overwrite
    // halves what the review screen shows before an irreversible sweep. Ids
    // arrive unsorted to pin the ordering too.
    const utxo = (coins: bigint, assets?: [string, bigint][]) =>
      [
        {},
        {
          value: {
            coins,
            assets: assets === undefined ? undefined : new Map(assets),
          },
        },
      ] as unknown as Cardano.Utxo;

    const summary = summarize({
      utxos: [
        utxo(2_000_000n, [
          ['bbb.token', 5n],
          ['aaa.token', 1n],
        ]),
        utxo(3_000_000n, [['bbb.token', 7n]]),
      ],
      rewardInfos: [],
      estimatedFee: 170_000n,
      sweptAccountCount: 1,
      scannedThroughAccountIndex: 0,
      scriptUtxoCount: 0,
      chunkCount: 1,
      protocolParameters: { stakeKeyDeposit: 2_000_000 },
    });

    expect(summary.totalCoin).toBe('5000000');
    expect(summary.assets).toEqual([
      { id: 'aaa.token', quantity: '1' },
      { id: 'bbb.token', quantity: '12' },
    ]);
    expect(summary.estimatedFee).toBe('170000');
    expect(summary.utxoCount).toBe(2);
  });

  it('sums withdrawable rewards across accounts', () => {
    const withRewards = (amount: bigint): SummarizeRewardInfo =>
      ({
        ...rewardInfo(false),
        withdrawableAmount: BigNumber(amount),
      } as SummarizeRewardInfo);

    expect(
      summarizeWith([withRewards(400_000n), withRewards(100_000n)])
        .withdrawableRewards,
    ).toBe('500000');
  });

  it('sums one deposit per registered stake key across a multi-account sweep', () => {
    expect(
      summarizeWith([rewardInfo(true), rewardInfo(true), rewardInfo(true)])
        .retainedStakeDeposit,
    ).toBe('6000000');
  });

  it('counts a deposit only for the registered accounts in a mixed set', () => {
    expect(
      summarizeWith([rewardInfo(true), rewardInfo(false)]).retainedStakeDeposit,
    ).toBe('2000000');
  });

  it('retains nothing when no stake key is registered', () => {
    expect(summarizeWith([rewardInfo(false)]).retainedStakeDeposit).toBe('0');
  });
});
