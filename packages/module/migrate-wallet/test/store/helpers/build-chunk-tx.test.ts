import { Cardano } from '@cardano-sdk/core';
import {
  CardanoPaymentAddress,
  CardanoRewardAccount,
} from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { buildChunkTx } from '../../../src/store/helpers/build-chunk-tx';

import type { SweepChunkPlan } from '../../../src/store/helpers/chunk-sweep-plan';
import type {
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

const rewardAccount = CardanoRewardAccount(
  'stake1uxpdrerp9wrxunfh6ukyv5267j70fzxgw0fr3z8zeac5vyqhf9jhy',
);

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

const rewardInfos: SweepChunkPlan['rewardInfos'] = [
  {
    rewardAccount,
    isActive: true,
    isRegistered: true,
    rewardsSum: BigNumber(1_500_000n),
    withdrawableAmount: BigNumber(1_500_000n),
    controlledAmount: BigNumber(1_500_000n),
  } as RewardAccountInfo & { rewardAccount: typeof rewardAccount },
];

describe('buildChunkTx', () => {
  it('builds a non-last chunk without withdrawals', async () => {
    const chunk: SweepChunkPlan = {
      index: 0,
      utxos: [createUtxo(5_000_000n)],
      rewardInfos,
      isLastChunk: false,
    };

    const tx = await buildChunkTx({
      chunk,
      protocolParameters,
      networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
      destinationAddress,
    });

    const body = tx.toCore().body;
    expect(body.inputs).toHaveLength(1);
    expect(body.outputs).toHaveLength(1);
    expect(body.outputs[0].address).toBe(destinationAddress);
    expect(body.withdrawals ?? []).toHaveLength(0);
  });

  it('builds the last chunk with withdrawals', async () => {
    const chunk: SweepChunkPlan = {
      index: 1,
      utxos: [createUtxo(5_000_000n)],
      rewardInfos,
      isLastChunk: true,
    };

    const tx = await buildChunkTx({
      chunk,
      protocolParameters,
      networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
      destinationAddress,
    });

    const body = tx.toCore().body;
    expect(body.inputs).toHaveLength(1);
    expect(body.outputs).toHaveLength(1);
    expect(body.outputs[0].address).toBe(destinationAddress);
    expect(body.withdrawals).toHaveLength(1);
    expect(body.withdrawals?.[0].quantity).toBe(1_500_000n);
  });

  it('sends output to the destination address', async () => {
    const chunk: SweepChunkPlan = {
      index: 0,
      utxos: [createUtxo(5_000_000n)],
      rewardInfos: [],
      isLastChunk: true,
    };

    const tx = await buildChunkTx({
      chunk,
      protocolParameters,
      networkMagic: Cardano.ChainIds.Mainnet.networkMagic,
      destinationAddress,
    });

    expect(tx.toCore().body.outputs[0].address).toBe(destinationAddress);
  });
});
