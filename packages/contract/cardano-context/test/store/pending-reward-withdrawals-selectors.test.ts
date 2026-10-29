// The pending-withdrawal selectors (LW-15725) read activities as they come
// back from persistence: encoded by Serializable, through JSON, decoded by
// the activities selectors. Quantities must survive exactly.
import { Cardano } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber, Timestamp } from '@lace-lib/util';
import { Serializable } from '@lace-lib/util-store';
import { describe, expect, it } from 'vitest';

import { pendingRewardWithdrawalKey } from '../../src';
import {
  cardanoContextActions as actions,
  cardanoContextReducers as reducers,
  cardanoContextSelectors as selectors,
  initialState,
} from '../../src/store/slice';

import type { Activity } from '@lace-contract/activities';

type SelectorState = Parameters<
  typeof selectors.cardanoContext.selectRewardAccountDetailsWithInFlight
>[0];

const ACCOUNT = AccountId('account-0');
const REWARD_ACCOUNT = Cardano.RewardAccount(
  'stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d',
);
// Above Number.MAX_SAFE_INTEGER: a lossy number round-trip would show.
const WITHDRAWN = 9_007_199_254_740_993n;

const pendingWithdrawal = (quantity: bigint): Activity => ({
  accountId: ACCOUNT,
  activityId: 'tx-pending',
  timestamp: Timestamp(0),
  tokenBalanceChanges: [],
  type: ActivityType.Pending,
  blockchainSpecific: Serializable.to({
    Cardano: {
      consumedInputs: [],
      producedOutputs: [],
      withdrawals: [{ stakeAddress: REWARD_ACCOUNT, quantity }],
    },
  }) as unknown,
});

const stateWith = ({
  withdrawable,
  activities,
}: {
  withdrawable: bigint;
  activities: Activity[];
}): SelectorState => {
  const cardanoContext = reducers.cardanoContext(
    initialState,
    actions.cardanoContext.setRewardAccountDetails({
      accountId: ACCOUNT,
      details: {
        rewardAccountInfo: {
          controlledAmount: BigNumber(withdrawable),
          isActive: true,
          isRegistered: true,
          rewardsSum: BigNumber(withdrawable),
          withdrawableAmount: BigNumber(withdrawable),
        },
      },
    }),
  );
  const state = {
    cardanoContext,
    activities: {
      activities: { [ACCOUNT]: activities },
      desiredLoadedActivitiesCountPerAccount: {},
      hasLoadedOldestEntry: {},
    },
    addresses: {
      addresses: [
        {
          accountId: ACCOUNT,
          address: 'addr_test1-account-0',
          blockchainName: 'Cardano',
          name: 'account 0',
          data: {
            networkMagic: Cardano.NetworkMagics.Preprod,
            rewardAccount: REWARD_ACCOUNT,
          },
        },
      ],
    },
  };
  // What a restart reads back from storage.
  return JSON.parse(JSON.stringify(state)) as SelectorState;
};

describe('pending reward withdrawal selectors', () => {
  it('reads pending withdrawals back from persisted activities exactly', () => {
    const state = stateWith({
      withdrawable: WITHDRAWN,
      activities: [pendingWithdrawal(WITHDRAWN)],
    });

    expect(
      selectors.cardanoContext.selectPendingRewardWithdrawals(state),
    ).toEqual(
      new Map([
        [
          pendingRewardWithdrawalKey(
            Cardano.NetworkMagics.Preprod,
            REWARD_ACCOUNT,
          ),
          WITHDRAWN,
        ],
      ]),
    );
  });

  it('stops counting rewards a pending transaction already withdrew', () => {
    const state = stateWith({
      withdrawable: WITHDRAWN + 5n,
      activities: [pendingWithdrawal(WITHDRAWN)],
    });

    expect(
      selectors.cardanoContext.selectRewardAccountDetailsWithInFlight(state)[
        ACCOUNT
      ]?.rewardAccountInfo.withdrawableAmount,
    ).toBe('5');
    // The raw view is what the chain reports, for screens and builders.
    expect(
      selectors.cardanoContext.selectRewardAccountDetails(state)[ACCOUNT]
        ?.rewardAccountInfo.withdrawableAmount,
    ).toBe((WITHDRAWN + 5n).toString());
  });

  it('returns the raw details when nothing is pending', () => {
    const state = stateWith({ withdrawable: 10n, activities: [] });

    expect(
      selectors.cardanoContext.selectRewardAccountDetailsWithInFlight(state),
    ).toBe(selectors.cardanoContext.selectRewardAccountDetails(state));
  });
});
