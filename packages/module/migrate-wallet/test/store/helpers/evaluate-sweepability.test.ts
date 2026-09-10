import { DREP_ALWAYS_ABSTAIN } from '@lace-contract/cardano-context';
import { BigNumber } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { evaluateSweepability } from '../../../src/store/helpers/evaluate-sweepability';

import type { SweepBuildOutcome } from '../../../src/store/helpers/evaluate-sweepability';
import type { Cardano } from '@cardano-sdk/core';
import type { RewardAccountInfo } from '@lace-contract/cardano-context';

const rewardInfo = (overrides: Partial<RewardAccountInfo>): RewardAccountInfo =>
  ({
    isActive: true,
    isRegistered: false,
    rewardsSum: BigNumber(0n),
    withdrawableAmount: BigNumber(0n),
    controlledAmount: BigNumber(0n),
    ...overrides,
  } as RewardAccountInfo);

const utxos = (count: number, coinsEach = 1_000_000n): Cardano.Utxo[] =>
  Array.from(
    { length: count },
    () => [{}, { value: { coins: coinsEach } }] as unknown as Cardano.Utxo,
  );

const built = (fee: bigint, chunkCount = 1): SweepBuildOutcome => ({
  built: true,
  fee,
  chunkCount,
});
const notBuilt: SweepBuildOutcome = { built: false };

describe('evaluateSweepability', () => {
  it('refuses rewards not vote-delegated with the blocked amount, above all else', () => {
    // A blocked reward wins even when the build failed: the terminal rewards refusal
    // must not be shadowed by the retryable cannot-cover-fee.
    const verdict = evaluateSweepability(
      {
        utxos: utxos(1),
        rewardInfos: [
          rewardInfo({ withdrawableAmount: BigNumber(2_000_000n) }),
        ],
      },
      notBuilt,
    );
    expect(verdict).toEqual({
      kind: 'refuse',
      errorKey: 'migrate-wallet.error.rewards-not-vote-delegated',
      amount: {
        value: '2000000',
        labelKey: 'migrate-wallet.unsupported.stuck-rewards',
      },
    });
  });

  it('refuses no-spendable-input, disclosing the stranded rewards', () => {
    const verdict = evaluateSweepability(
      {
        utxos: utxos(0),
        rewardInfos: [
          rewardInfo({
            isRegistered: true,
            withdrawableAmount: BigNumber(500_000n),
            // Delegated to abstain, so the rewards are not the blocking reason:
            // the zero-UTxO no-input refusal is.
            drepId: DREP_ALWAYS_ABSTAIN,
          }),
        ],
      },
      notBuilt,
    );
    expect(verdict).toEqual({
      kind: 'refuse',
      errorKey: 'migrate-wallet.error.no-spendable-input',
      amount: {
        // The withdrawable rewards alone: the 2_000_000 stake deposit is not
        // disclosed, because the sweep never claims it (FR-5).
        value: '500000',
        labelKey: 'migrate-wallet.unsupported.stuck-amount',
      },
    });
  });

  it('refuses a registered-key-only source without disclosing any amount', () => {
    const verdict = evaluateSweepability(
      {
        utxos: utxos(0),
        rewardInfos: [
          rewardInfo({ isRegistered: true, drepId: DREP_ALWAYS_ABSTAIN }),
        ],
      },
      notBuilt,
    );
    expect(verdict).toEqual({
      kind: 'refuse',
      errorKey: 'migrate-wallet.error.no-spendable-input',
      amount: undefined,
    });
  });

  it('leaves the stake deposit out of the cannot-cover-fee figure', () => {
    const verdict = evaluateSweepability(
      {
        utxos: utxos(1, 1_500_000n),
        rewardInfos: [
          rewardInfo({ isRegistered: true, drepId: DREP_ALWAYS_ABSTAIN }),
        ],
      },
      notBuilt,
    );
    expect(verdict).toEqual({
      kind: 'refuse',
      errorKey: 'migrate-wallet.error.cannot-cover-fee',
      amount: {
        // The spendable 1_500_000 only. Adding the 2_000_000 deposit made the
        // figure argue against the reason above it: "3.5 ADA can't move yet"
        // over "not enough ADA to cover the transaction fee".
        value: '1500000',
        labelKey: 'migrate-wallet.unsupported.stuck-amount',
      },
    });
  });

  it('proceeds with a zero fee when there is nothing to sweep', () => {
    const verdict = evaluateSweepability(
      { utxos: utxos(0), rewardInfos: [] },
      notBuilt,
    );
    expect(verdict).toEqual({
      kind: 'proceed',
      estimatedFee: 0n,
      chunkCount: 0,
    });
  });

  it('refuses cannot-cover-fee, disclosing the ADA found', () => {
    const verdict = evaluateSweepability(
      { utxos: utxos(2, 400_000n), rewardInfos: [] },
      notBuilt,
    );
    expect(verdict).toEqual({
      kind: 'refuse',
      errorKey: 'migrate-wallet.error.cannot-cover-fee',
      amount: {
        // two 400_000 UTxOs
        value: '800000',
        labelKey: 'migrate-wallet.unsupported.stuck-amount',
      },
    });
  });

  it('proceeds with the built fee when the sweep is buildable (single chunk)', () => {
    const verdict = evaluateSweepability(
      {
        utxos: utxos(2),
        rewardInfos: [
          rewardInfo({
            withdrawableAmount: BigNumber(1_000_000n),
            drepId: DREP_ALWAYS_ABSTAIN,
          }),
        ],
      },
      built(180_000n),
    );
    expect(verdict).toEqual({
      kind: 'proceed',
      estimatedFee: 180_000n,
      chunkCount: 1,
    });
  });

  it('proceeds with multi-chunk when chunkCount > 1 (FR-6)', () => {
    const verdict = evaluateSweepability(
      {
        utxos: utxos(10),
        rewardInfos: [],
      },
      built(500_000n, 3),
    );
    expect(verdict).toEqual({
      kind: 'proceed',
      estimatedFee: 500_000n,
      chunkCount: 3,
    });
  });

  // The destination pays for its own delegation out of what the sweep sends it,
  // so this shortfall lands AFTER the money has moved unless it is caught here.
  describe('delegation reserve', () => {
    it('refuses when what arrives cannot cover the destination delegation', () => {
      const verdict = evaluateSweepability(
        {
          utxos: utxos(1, 2_500_000n),
          rewardInfos: [rewardInfo({ drepId: DREP_ALWAYS_ABSTAIN })],
          delegationReserve: 2_500_000n,
        },
        built(200_000n),
      );
      expect(verdict).toEqual({
        kind: 'refuse',
        errorKey: 'migrate-wallet.error.cannot-cover-delegation',
        amount: {
          value: '2300000',
          labelKey: 'migrate-wallet.unsupported.stuck-amount',
        },
      });
    });

    it('counts withdrawn rewards towards the reserve, since they arrive too', () => {
      const verdict = evaluateSweepability(
        {
          utxos: utxos(1, 2_000_000n),
          rewardInfos: [
            rewardInfo({
              drepId: DREP_ALWAYS_ABSTAIN,
              withdrawableAmount: BigNumber(1_000_000n),
            }),
          ],
          delegationReserve: 2_500_000n,
        },
        built(200_000n),
      );
      expect(verdict).toEqual({
        kind: 'proceed',
        estimatedFee: 200_000n,
        chunkCount: 1,
      });
    });

    // Exactly enough is enough: the boundary the < operator decides.
    it('proceeds when what arrives exactly equals the reserve', () => {
      const verdict = evaluateSweepability(
        {
          utxos: utxos(1, 2_700_000n),
          rewardInfos: [rewardInfo({ drepId: DREP_ALWAYS_ABSTAIN })],
          delegationReserve: 2_500_000n,
        },
        built(200_000n),
      );
      expect(verdict).toEqual({
        kind: 'proceed',
        estimatedFee: 200_000n,
        chunkCount: 1,
      });
    });

    // Omitting the reserve must not start refusing sweeps that were fine before.
    it('is inert when no delegation will run', () => {
      const verdict = evaluateSweepability(
        {
          utxos: utxos(1, 1_000_000n),
          rewardInfos: [rewardInfo({ drepId: DREP_ALWAYS_ABSTAIN })],
        },
        built(200_000n),
      );
      expect(verdict).toEqual({
        kind: 'proceed',
        estimatedFee: 200_000n,
        chunkCount: 1,
      });
    });
  });
});
