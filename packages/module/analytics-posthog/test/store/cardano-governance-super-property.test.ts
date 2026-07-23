import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import {
  VOTING_POWER_SIGNIFICANT_FIGURES,
  approximateVotingPower,
  buildCardanoGovernanceAccounts,
} from '../../src/store/cardano-governance-super-property';

import type {
  AccountRewardAccountDetailsMap,
  RewardAccountInfo,
} from '@lace-contract/cardano-context';

const DREP_ALWAYS_ABSTAIN = 'drep_always_abstain';
const DREP_ALWAYS_NO_CONFIDENCE = 'drep_always_no_confidence';

// controlledAmount is the @lace-lib/util BigNumber value object: a serialized
// bigint in lovelace (1 ADA = 1e6 lovelace).
const lovelace = (ada: number): BigNumber =>
  BigNumber(BigInt(Math.round(ada * 1_000_000)));

const makeInfo = (over: Partial<RewardAccountInfo>): RewardAccountInfo => ({
  rewardsSum: BigNumber(0n),
  isActive: true,
  isRegistered: true,
  controlledAmount: BigNumber(0n),
  withdrawableAmount: BigNumber(0n),
  ...over,
});

describe('approximateVotingPower', () => {
  it('defaults to 3 significant figures', () => {
    expect(VOTING_POWER_SIGNIFICANT_FIGURES).toBe(3);
  });

  it('rounds to the default significant figures across magnitudes', () => {
    expect(approximateVotingPower(lovelace(4321.55))).toBe(4320);
    expect(approximateVotingPower(lovelace(52))).toBe(52);
    expect(approximateVotingPower(lovelace(987_654))).toBe(988_000);
    expect(approximateVotingPower(lovelace(0.4217))).toBe(0.422);
  });

  it('returns 0 for zero and negative input', () => {
    expect(approximateVotingPower(lovelace(0))).toBe(0);
    expect(approximateVotingPower(lovelace(-5))).toBe(0);
  });

  it('honours a non-default figures argument', () => {
    expect(approximateVotingPower(lovelace(4321.55), 2)).toBe(4300);
  });
});

describe('buildCardanoGovernanceAccounts', () => {
  const delegated = AccountId('wallet1-0-764824073');
  const abstaining = AccountId('wallet1-1-764824073');
  const noConfidence = AccountId('wallet1-2-764824073');
  const notDelegatedWithStake = AccountId('wallet1-3-764824073');
  const noRewardDetails = AccountId('wallet1-4-764824073');

  const details: AccountRewardAccountDetailsMap = {
    [delegated]: {
      rewardAccountInfo: makeInfo({
        drepId: 'drep1abc',
        controlledAmount: lovelace(4321.55),
      }),
    },
    [abstaining]: {
      rewardAccountInfo: makeInfo({
        drepId: DREP_ALWAYS_ABSTAIN,
        controlledAmount: lovelace(52_000),
      }),
    },
    [noConfidence]: {
      rewardAccountInfo: makeInfo({
        drepId: DREP_ALWAYS_NO_CONFIDENCE,
        controlledAmount: lovelace(10),
      }),
    },
    // Has stake (voting power) but has not delegated its vote.
    [notDelegatedWithStake]: {
      rewardAccountInfo: makeInfo({
        drepId: undefined,
        controlledAmount: lovelace(4321.55),
      }),
    },
  };

  it('maps delegated / abstain / no-confidence / not-delegated-with-stake / missing accounts', () => {
    const result = buildCardanoGovernanceAccounts(
      [
        { accountId: delegated },
        { accountId: abstaining },
        { accountId: noConfidence },
        { accountId: notDelegatedWithStake },
        { accountId: noRewardDetails },
      ],
      details,
    );

    expect(result).toEqual([
      { accountId: delegated, delegatedTo: 'drep1abc', votingPower: 4320 },
      {
        accountId: abstaining,
        delegatedTo: 'always-abstain',
        votingPower: 52_000,
      },
      {
        accountId: noConfidence,
        delegatedTo: 'always-no-confidence',
        votingPower: 10,
      },
      // Voting power reported even though the account is not delegating.
      {
        accountId: notDelegatedWithStake,
        delegatedTo: null,
        votingPower: 4320,
      },
      // No reward details fetched yet -> zero voting power, not delegated.
      { accountId: noRewardDetails, delegatedTo: null, votingPower: 0 },
    ]);
  });
});
