import { Cardano, Milliseconds } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { TokenId } from '@lace-contract/tokens';
import {
  AccountId,
  WalletId,
  WalletType,
  walletsActions,
} from '@lace-contract/wallet-repo';
import { Serializable } from '@lace-lib/util-store';
import { BigNumber, Timestamp } from '@lace-sdk/util';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  CardanoRewardAccount,
  CardanoPaymentAddress,
  CardanoNetworkId,
  CardanoAccountId,
} from '../../src';
import {
  cardanoContextActions as actions,
  cardanoContextReducers as reducers,
  cardanoContextSelectors as selectors,
} from '../../src/store/slice';
import {
  cardanoAccount1Addr,
  cardanoAccount2Addr1,
  cardanoAccount2Addr2,
  createTransactionHistoryItem,
  tip1,
  utxo1,
  utxo2,
} from '../mocks';

import type {
  AccountRewardAccountDetailsMap,
  CardanoContextSliceState,
  CardanoTransactionHistoryItem,
  RequiredProtocolParameters,
  Reward,
} from '../../src';
import type { EraSummary } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type { NetworkSliceState, NetworkType } from '@lace-contract/network';
import type { WalletEntity } from '@lace-contract/wallet-repo';

describe('cardanoContext slice', () => {
  let initialState: CardanoContextSliceState;
  const protocolParameters = {
    stakeKeyDeposit: 1000000,
    poolDeposit: 1000000,
  } as RequiredProtocolParameters;

  const testNetwork = CardanoNetworkId(Cardano.NetworkMagics.Preprod);

  beforeEach(() => {
    initialState = {
      accountTransactionHistory: {},
      accountRewardsHistory: {},
      networkInfo: {},
      accountUtxos: {},
      accountUnspendableUtxos: {},
      accountTransactionsTotal: {},
      rewardAccountDetails: {},
      accountDelegationsHistory: {},
      delegationActivities: {},
      delegationErrors: {},
    };
  });

  describe('reducers', () => {
    describe('setTip', () => {
      it('should set the tip for the specified network', () => {
        const action = actions.cardanoContext.setTip({
          network: testNetwork,
          tip: tip1,
        });

        const state = reducers.cardanoContext(initialState, action);

        expect(state.networkInfo[testNetwork]?.tip).toEqual(tip1);
      });

      it('should store tips for different networks separately', () => {
        const previewNetwork = CardanoNetworkId(Cardano.NetworkMagics.Preview);
        const tip2 = { blockNo: 2 } as Cardano.Tip;

        let state = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setTip({ network: testNetwork, tip: tip1 }),
        );
        state = reducers.cardanoContext(
          state,
          actions.cardanoContext.setTip({ network: previewNetwork, tip: tip2 }),
        );

        expect(state.networkInfo[testNetwork]?.tip).toEqual(tip1);
        expect(state.networkInfo[previewNetwork]?.tip).toEqual(tip2);
      });
    });

    describe('setProtocolParameters', () => {
      it('should set the protocol parameters for the specified network', () => {
        const action = actions.cardanoContext.setProtocolParameters({
          network: testNetwork,
          protocolParameters,
        });

        const state = reducers.cardanoContext(initialState, action);

        expect(state.networkInfo[testNetwork]?.protocolParameters).toEqual({
          stakeKeyDeposit: 1000000,
          poolDeposit: 1000000,
        });
      });

      it('should store protocol parameters for different networks separately', () => {
        const previewNetwork = CardanoNetworkId(Cardano.NetworkMagics.Preview);
        const protocolParameters2 = {
          stakeKeyDeposit: 2000000,
          poolDeposit: 2000000,
        } as RequiredProtocolParameters;

        let state = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setProtocolParameters({
            network: testNetwork,
            protocolParameters,
          }),
        );
        state = reducers.cardanoContext(
          state,
          actions.cardanoContext.setProtocolParameters({
            network: previewNetwork,
            protocolParameters: protocolParameters2,
          }),
        );

        expect(state.networkInfo[testNetwork]?.protocolParameters).toEqual({
          stakeKeyDeposit: 1000000,
          poolDeposit: 1000000,
        });
        expect(state.networkInfo[previewNetwork]?.protocolParameters).toEqual({
          stakeKeyDeposit: 2000000,
          poolDeposit: 2000000,
        });
      });
    });

    describe('setEraSummaries', () => {
      it('should set the era summaries for the specified network', () => {
        const eraSummaries: EraSummary[] = [
          {
            parameters: { epochLength: 21600, slotLength: Milliseconds(20000) },
            start: { slot: 0, time: new Date('2022-06-01T00:00:00.000Z') },
          },
        ];
        const action = actions.cardanoContext.setEraSummaries({
          network: testNetwork,
          eraSummaries,
        });

        const state = reducers.cardanoContext(initialState, action);

        expect(state.networkInfo[testNetwork]?.eraSummaries).toEqual(
          Serializable.to(eraSummaries),
        );
      });

      it('should store era summaries for different networks separately', () => {
        const previewNetwork = CardanoNetworkId(Cardano.NetworkMagics.Preview);
        const eraSummaries1: EraSummary[] = [
          {
            parameters: { epochLength: 21600, slotLength: Milliseconds(20000) },
            start: { slot: 0, time: new Date('2022-06-01T00:00:00.000Z') },
          },
        ];
        const eraSummaries2: EraSummary[] = [
          {
            parameters: { epochLength: 43200, slotLength: Milliseconds(10000) },
            start: { slot: 0, time: new Date('2022-07-01T00:00:00.000Z') },
          },
        ];

        let state = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setEraSummaries({
            network: testNetwork,
            eraSummaries: eraSummaries1,
          }),
        );
        state = reducers.cardanoContext(
          state,
          actions.cardanoContext.setEraSummaries({
            network: previewNetwork,
            eraSummaries: eraSummaries2,
          }),
        );

        expect(state.networkInfo[testNetwork]?.eraSummaries).toEqual(
          Serializable.to(eraSummaries1),
        );
        expect(state.networkInfo[previewNetwork]?.eraSummaries).toEqual(
          Serializable.to(eraSummaries2),
        );
      });
    });

    describe('setAccountRewardsHistory', () => {
      it('should set the account rewards history', () => {
        const testRewardHistory = {
          [CardanoRewardAccount(
            'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
          )]: [
            {
              epoch: Cardano.EpochNo(100),
              rewards: BigNumber(BigInt(1000000)),
              poolId: Cardano.PoolId(
                'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
              ),
            },
          ],
        };

        const action = actions.cardanoContext.setAccountRewardsHistory({
          accountId: AccountId('test1'),
          rewardsHistory: testRewardHistory,
        });

        const state = reducers.cardanoContext(initialState, action);

        expect(state.accountRewardsHistory).toEqual({
          [AccountId('test1')]: testRewardHistory,
        });
      });
    });

    describe('setAccountDelegationsHistory', () => {
      const accountId = AccountId('test1');
      const rewardAccount = CardanoRewardAccount(
        'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
      );
      const delegationEntry = {
        activeEpoch: Cardano.EpochNo(100),
        txHash: Cardano.TransactionId(
          '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2',
        ),
        amount: BigNumber(BigInt(1000000)),
        poolId: Cardano.PoolId(
          'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
        ),
      };
      const registrationEntry = {
        txHash: Cardano.TransactionId(
          '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20',
        ),
        action: 'registered' as const,
      };
      const withdrawalEntry = {
        txHash: Cardano.TransactionId(
          'f0e1d2c3b4a5968778695a4b3c2d1e0f00112233445566778899aabbccddeeff',
        ),
        amount: BigNumber(BigInt(2500000)),
      };

      it('should initialize and append delegations', () => {
        const action = actions.cardanoContext.setAccountDelegationsHistory({
          accountId,
          rewardAccount,
          items: [delegationEntry],
        });

        const state = reducers.cardanoContext(initialState, action);

        expect(
          state.accountDelegationsHistory[accountId][rewardAccount],
        ).toEqual([delegationEntry]);
      });

      it('should append to existing delegations entries', () => {
        const firstState = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount,
            items: [delegationEntry],
          }),
        );

        const nextDelegation = {
          ...delegationEntry,
          activeEpoch: Cardano.EpochNo(101),
        };
        const secondState = reducers.cardanoContext(
          firstState,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount,
            items: [nextDelegation],
          }),
        );

        expect(
          secondState.accountDelegationsHistory[accountId][rewardAccount],
        ).toEqual([delegationEntry, nextDelegation]);
      });

      it('should append registrations and preserve delegations', () => {
        const firstState = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount,
            items: [delegationEntry],
          }),
        );

        const state = reducers.cardanoContext(
          firstState,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount,
            items: [registrationEntry],
          }),
        );

        expect(
          state.accountDelegationsHistory[accountId][rewardAccount],
        ).toEqual([delegationEntry, registrationEntry]);
      });

      it('should append withdrawals and preserve existing entries', () => {
        const firstState = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount,
            items: [registrationEntry],
          }),
        );

        const state = reducers.cardanoContext(
          firstState,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount,
            items: [withdrawalEntry],
          }),
        );

        expect(
          state.accountDelegationsHistory[accountId][rewardAccount],
        ).toEqual([registrationEntry, withdrawalEntry]);
      });

      it('should append mixed items in a single call', () => {
        const state = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount,
            items: [delegationEntry, registrationEntry, withdrawalEntry],
          }),
        );

        expect(
          state.accountDelegationsHistory[accountId][rewardAccount],
        ).toEqual([delegationEntry, registrationEntry, withdrawalEntry]);
      });
    });

    describe('setDelegationActivities', () => {
      const accountId = AccountId('test1');
      const rewardAccount = CardanoRewardAccount(
        'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
      );
      const rewardAccount2 = CardanoRewardAccount(
        'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
      );

      const createActivity = (
        activityId: string,
        type: ActivityType,
        timestamp: number,
      ): Activity => ({
        accountId,
        activityId,
        type,
        timestamp: Timestamp(timestamp),
        tokenBalanceChanges: [
          {
            tokenId: TokenId('lovelace'),
            amount: BigNumber(BigInt(1000000)),
          },
        ],
      });

      it('should initialize delegationActivities structure when setting activities for the first time', () => {
        const activities = [
          createActivity('activity1', ActivityType.Delegation, 1000),
        ];

        const action = actions.cardanoContext.setDelegationActivities({
          accountId,
          rewardAccount,
          activities,
        });

        const state = reducers.cardanoContext(initialState, action);

        expect(state.delegationActivities).toBeDefined();
        expect(state.delegationActivities[accountId]).toBeDefined();
        expect(
          state.delegationActivities[accountId][rewardAccount],
        ).toBeDefined();
        expect(
          state.delegationActivities[accountId][rewardAccount],
        ).toHaveLength(1);
        expect(
          state.delegationActivities[accountId][rewardAccount][0].activityId,
        ).toBe('activity1');
      });

      it('should append new activities to existing ones', () => {
        const initialActivities = [
          createActivity('activity1', ActivityType.Delegation, 1000),
          createActivity('activity2', ActivityType.Registration, 2000),
        ];

        const firstState = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setDelegationActivities({
            accountId,
            rewardAccount,
            activities: initialActivities,
          }),
        );

        const newActivities = [
          createActivity('activity3', ActivityType.Withdrawal, 3000),
        ];

        const finalState = reducers.cardanoContext(
          firstState,
          actions.cardanoContext.setDelegationActivities({
            accountId,
            rewardAccount,
            activities: newActivities,
          }),
        );

        expect(
          finalState.delegationActivities[accountId][rewardAccount],
        ).toHaveLength(3);
        expect(
          finalState.delegationActivities[accountId][rewardAccount].map(
            a => a.activityId,
          ),
        ).toEqual(['activity3', 'activity2', 'activity1']);
      });

      it('should deduplicate activities by activityId and type', () => {
        const activities1 = [
          createActivity('activity1', ActivityType.Delegation, 1000),
          createActivity('activity2', ActivityType.Registration, 2000),
        ];

        const firstState = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setDelegationActivities({
            accountId,
            rewardAccount,
            activities: activities1,
          }),
        );

        // Add same activity again with different timestamp
        const activities2 = [
          createActivity('activity1', ActivityType.Delegation, 5000),
          createActivity('activity3', ActivityType.Withdrawal, 3000),
        ];

        const finalState = reducers.cardanoContext(
          firstState,
          actions.cardanoContext.setDelegationActivities({
            accountId,
            rewardAccount,
            activities: activities2,
          }),
        );

        // Should have 3 unique activities (activity1, activity2, activity3)
        // activity1 should be deduplicated, keeping the newer one
        expect(
          finalState.delegationActivities[accountId][rewardAccount],
        ).toHaveLength(3);
        const activityIds = finalState.delegationActivities[accountId][
          rewardAccount
        ].map(a => a.activityId);
        expect(activityIds).toContain('activity1');
        expect(activityIds).toContain('activity2');
        expect(activityIds).toContain('activity3');
      });

      it('should allow same activityId with different types', () => {
        const activities = [
          createActivity('activity1', ActivityType.Delegation, 1000),
          createActivity('activity1', ActivityType.Registration, 2000),
          createActivity('activity1', ActivityType.Withdrawal, 3000),
        ];

        const action = actions.cardanoContext.setDelegationActivities({
          accountId,
          rewardAccount,
          activities,
        });

        const state = reducers.cardanoContext(initialState, action);

        // All three should be present since they have different types
        expect(
          state.delegationActivities[accountId][rewardAccount],
        ).toHaveLength(3);
      });

      it('should sort activities by timestamp descending (newest first)', () => {
        const activities = [
          createActivity('activity1', ActivityType.Delegation, 1000),
          createActivity('activity2', ActivityType.Registration, 3000),
          createActivity('activity3', ActivityType.Withdrawal, 2000),
        ];

        const action = actions.cardanoContext.setDelegationActivities({
          accountId,
          rewardAccount,
          activities,
        });

        const state = reducers.cardanoContext(initialState, action);

        const timestamps = state.delegationActivities[accountId][
          rewardAccount
        ].map(a => a.timestamp);
        expect(timestamps).toEqual([3000, 2000, 1000]);
      });

      it('should handle multiple accounts independently', () => {
        const accountId2 = AccountId('test2');
        const activities1 = [
          createActivity('activity1', ActivityType.Delegation, 1000),
        ];
        const activities2 = [
          createActivity('activity2', ActivityType.Registration, 2000),
        ];

        const firstState = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setDelegationActivities({
            accountId,
            rewardAccount,
            activities: activities1,
          }),
        );

        const finalState = reducers.cardanoContext(
          firstState,
          actions.cardanoContext.setDelegationActivities({
            accountId: accountId2,
            rewardAccount,
            activities: activities2,
          }),
        );

        expect(
          finalState.delegationActivities[accountId][rewardAccount],
        ).toHaveLength(1);
        expect(
          finalState.delegationActivities[accountId][rewardAccount][0]
            .activityId,
        ).toBe('activity1');

        expect(
          finalState.delegationActivities[accountId2][rewardAccount],
        ).toHaveLength(1);
        expect(
          finalState.delegationActivities[accountId2][rewardAccount][0]
            .activityId,
        ).toBe('activity2');
      });

      it('should handle multiple reward accounts independently', () => {
        const activities1 = [
          createActivity('activity1', ActivityType.Delegation, 1000),
        ];
        const activities2 = [
          createActivity('activity2', ActivityType.Registration, 2000),
        ];

        const firstState = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setDelegationActivities({
            accountId,
            rewardAccount,
            activities: activities1,
          }),
        );

        const finalState = reducers.cardanoContext(
          firstState,
          actions.cardanoContext.setDelegationActivities({
            accountId,
            rewardAccount: rewardAccount2,
            activities: activities2,
          }),
        );

        expect(
          finalState.delegationActivities[accountId][rewardAccount],
        ).toHaveLength(1);
        expect(
          finalState.delegationActivities[accountId][rewardAccount][0]
            .activityId,
        ).toBe('activity1');

        expect(
          finalState.delegationActivities[accountId][rewardAccount2],
        ).toHaveLength(1);
        expect(
          finalState.delegationActivities[accountId][rewardAccount2][0]
            .activityId,
        ).toBe('activity2');
      });

      it('should handle empty activities array', () => {
        const action = actions.cardanoContext.setDelegationActivities({
          accountId,
          rewardAccount,
          activities: [],
        });

        const state = reducers.cardanoContext(initialState, action);

        expect(state.delegationActivities).toBeDefined();
        expect(state.delegationActivities[accountId]).toBeDefined();
        expect(
          state.delegationActivities[accountId][rewardAccount],
        ).toBeDefined();
        expect(
          state.delegationActivities[accountId][rewardAccount],
        ).toHaveLength(0);
      });
    });

    describe('clearAccountDelegationHistory', () => {
      const accountId = AccountId('test1');
      const rewardAccount = CardanoRewardAccount(
        'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
      );
      const rewardAccount2 = CardanoRewardAccount(
        'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
      );

      const delegationEntry = {
        activeEpoch: Cardano.EpochNo(100),
        txHash: Cardano.TransactionId(
          '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2',
        ),
        amount: BigNumber(BigInt(1000000)),
        poolId: Cardano.PoolId(
          'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
        ),
      };

      const createActivity = (
        activityId: string,
        type: ActivityType,
        timestamp: number,
      ): Activity => ({
        accountId,
        activityId,
        type,
        timestamp: Timestamp(timestamp),
        tokenBalanceChanges: [
          {
            tokenId: TokenId('lovelace'),
            amount: BigNumber(BigInt(1000000)),
          },
        ],
      });

      it('should clear account delegations history for a specific reward account', () => {
        const stateWithHistory = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount,
            items: [delegationEntry],
          }),
        );

        expect(
          stateWithHistory.accountDelegationsHistory[accountId][rewardAccount],
        ).toBeDefined();

        const clearedState = reducers.cardanoContext(
          stateWithHistory,
          actions.cardanoContext.clearAccountDelegationHistory({
            accountId,
            rewardAccount,
          }),
        );

        // Account entry should be removed since it's now empty
        expect(
          clearedState.accountDelegationsHistory[accountId],
        ).toBeUndefined();
      });

      it('should clear delegation activities for a specific reward account', () => {
        const activities = [
          createActivity('activity1', ActivityType.Delegation, 1000),
          createActivity('activity2', ActivityType.Registration, 2000),
        ];

        const stateWithActivities = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setDelegationActivities({
            accountId,
            rewardAccount,
            activities,
          }),
        );

        expect(
          stateWithActivities.delegationActivities[accountId][rewardAccount],
        ).toHaveLength(2);

        const clearedState = reducers.cardanoContext(
          stateWithActivities,
          actions.cardanoContext.clearAccountDelegationHistory({
            accountId,
            rewardAccount,
          }),
        );

        // Account entry should be removed since it's now empty
        expect(clearedState.delegationActivities[accountId]).toBeUndefined();
      });

      it('should clear both delegations history and activities in one action', () => {
        const stateWithData = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount,
            items: [delegationEntry],
          }),
        );

        const stateWithBoth = reducers.cardanoContext(
          stateWithData,
          actions.cardanoContext.setDelegationActivities({
            accountId,
            rewardAccount,
            activities: [
              createActivity('activity1', ActivityType.Delegation, 1000),
            ],
          }),
        );

        expect(
          stateWithBoth.accountDelegationsHistory[accountId][rewardAccount],
        ).toBeDefined();
        expect(
          stateWithBoth.delegationActivities[accountId][rewardAccount],
        ).toBeDefined();

        const clearedState = reducers.cardanoContext(
          stateWithBoth,
          actions.cardanoContext.clearAccountDelegationHistory({
            accountId,
            rewardAccount,
          }),
        );

        // Account entries should be removed since they're now empty
        expect(
          clearedState.accountDelegationsHistory[accountId],
        ).toBeUndefined();
        expect(clearedState.delegationActivities[accountId]).toBeUndefined();
      });

      it('should only clear the specified reward account, leaving others intact', () => {
        const stateWithMultiple = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount,
            items: [delegationEntry],
          }),
        );

        const stateWithBothAccounts = reducers.cardanoContext(
          stateWithMultiple,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount: rewardAccount2,
            items: [delegationEntry],
          }),
        );

        expect(
          stateWithBothAccounts.accountDelegationsHistory[accountId][
            rewardAccount
          ],
        ).toBeDefined();
        expect(
          stateWithBothAccounts.accountDelegationsHistory[accountId][
            rewardAccount2
          ],
        ).toBeDefined();

        const clearedState = reducers.cardanoContext(
          stateWithBothAccounts,
          actions.cardanoContext.clearAccountDelegationHistory({
            accountId,
            rewardAccount,
          }),
        );

        // First reward account should be cleared
        expect(
          clearedState.accountDelegationsHistory[accountId][rewardAccount],
        ).toBeUndefined();
        // Second reward account should still exist
        expect(
          clearedState.accountDelegationsHistory[accountId][rewardAccount2],
        ).toBeDefined();
      });

      it('should clean up empty account entry when no reward accounts remain', () => {
        const stateWithHistory = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount,
            items: [delegationEntry],
          }),
        );

        expect(
          stateWithHistory.accountDelegationsHistory[accountId],
        ).toBeDefined();

        const clearedState = reducers.cardanoContext(
          stateWithHistory,
          actions.cardanoContext.clearAccountDelegationHistory({
            accountId,
            rewardAccount,
          }),
        );

        // Account entry should be removed since it's now empty
        expect(
          clearedState.accountDelegationsHistory[accountId],
        ).toBeUndefined();
      });

      it('should clean up empty account entry in delegation activities when no reward accounts remain', () => {
        const stateWithActivities = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setDelegationActivities({
            accountId,
            rewardAccount,
            activities: [
              createActivity('activity1', ActivityType.Delegation, 1000),
            ],
          }),
        );

        expect(
          stateWithActivities.delegationActivities[accountId],
        ).toBeDefined();

        const clearedState = reducers.cardanoContext(
          stateWithActivities,
          actions.cardanoContext.clearAccountDelegationHistory({
            accountId,
            rewardAccount,
          }),
        );

        // Account entry should be removed since it's now empty
        expect(clearedState.delegationActivities[accountId]).toBeUndefined();
      });

      it('should not remove account entry when other reward accounts still exist', () => {
        const stateWithMultiple = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount,
            items: [delegationEntry],
          }),
        );

        const stateWithBothAccounts = reducers.cardanoContext(
          stateWithMultiple,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount: rewardAccount2,
            items: [delegationEntry],
          }),
        );

        const clearedState = reducers.cardanoContext(
          stateWithBothAccounts,
          actions.cardanoContext.clearAccountDelegationHistory({
            accountId,
            rewardAccount,
          }),
        );

        // Account entry should still exist because rewardAccount2 still has data
        expect(clearedState.accountDelegationsHistory[accountId]).toBeDefined();
        expect(
          clearedState.accountDelegationsHistory[accountId][rewardAccount2],
        ).toBeDefined();
      });

      it('should handle clearing non-existent reward account gracefully', () => {
        const action = actions.cardanoContext.clearAccountDelegationHistory({
          accountId,
          rewardAccount,
        });

        const state = reducers.cardanoContext(initialState, action);

        // Should not throw and state should remain unchanged
        expect(state.accountDelegationsHistory).toEqual({});
        expect(state.delegationActivities).toEqual({});
      });

      it('should handle clearing from non-existent account gracefully', () => {
        const nonExistentAccountId = AccountId('non-existent');
        const action = actions.cardanoContext.clearAccountDelegationHistory({
          accountId: nonExistentAccountId,
          rewardAccount,
        });

        const state = reducers.cardanoContext(initialState, action);

        // Should not throw and state should remain unchanged
        expect(state.accountDelegationsHistory).toEqual({});
        expect(state.delegationActivities).toEqual({});
      });

      it('should only affect the specified account, leaving other accounts intact', () => {
        const accountId2 = AccountId('test2');

        const stateWithMultipleAccounts = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId,
            rewardAccount,
            items: [delegationEntry],
          }),
        );

        const stateWithBoth = reducers.cardanoContext(
          stateWithMultipleAccounts,
          actions.cardanoContext.setAccountDelegationsHistory({
            accountId: accountId2,
            rewardAccount,
            items: [delegationEntry],
          }),
        );

        const clearedState = reducers.cardanoContext(
          stateWithBoth,
          actions.cardanoContext.clearAccountDelegationHistory({
            accountId,
            rewardAccount,
          }),
        );

        // First account should be cleared
        expect(
          clearedState.accountDelegationsHistory[accountId],
        ).toBeUndefined();
        // Second account should still exist
        expect(
          clearedState.accountDelegationsHistory[accountId2],
        ).toBeDefined();
        expect(
          clearedState.accountDelegationsHistory[accountId2][rewardAccount],
        ).toBeDefined();
      });
    });

    describe('account address transaction history', () => {
      const exampleTxId =
        '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2';
      const exampleHistoryItem: CardanoTransactionHistoryItem =
        createTransactionHistoryItem({
          id: exampleTxId,
          blockTime: Date.now(),
        });

      describe('setAccountTransactionHistory', () => {
        it('sets address transaction histories for accounts', () => {
          const firstState = reducers.cardanoContext(
            initialState,
            actions.cardanoContext.setAccountTransactionHistory({
              accountId: cardanoAccount1Addr.accountId,
              addressHistories: [
                {
                  address: CardanoPaymentAddress(cardanoAccount1Addr.address),
                  transactionHistory: [exampleHistoryItem],
                  hasLoadedOldestEntry: false,
                },
              ],
            }),
          );

          const finalState = reducers.cardanoContext(
            firstState,
            actions.cardanoContext.setAccountTransactionHistory({
              accountId: cardanoAccount2Addr2.accountId,
              addressHistories: [
                {
                  address: CardanoPaymentAddress(cardanoAccount2Addr1.address),
                  transactionHistory: [exampleHistoryItem],
                  hasLoadedOldestEntry: false,
                },
                {
                  address: CardanoPaymentAddress(cardanoAccount2Addr2.address),
                  transactionHistory: [exampleHistoryItem],
                  hasLoadedOldestEntry: true,
                },
              ],
            }),
          );
          expect(finalState.accountTransactionHistory).toStrictEqual({
            [cardanoAccount1Addr.accountId]: {
              [cardanoAccount1Addr.address]: {
                transactionHistory: [exampleHistoryItem],
                hasLoadedOldestEntry: false,
              },
            },
            [cardanoAccount2Addr2.accountId]: {
              [cardanoAccount2Addr1.address]: {
                transactionHistory: [exampleHistoryItem],
                hasLoadedOldestEntry: false,
              },
              [cardanoAccount2Addr2.address]: {
                transactionHistory: [exampleHistoryItem],
                hasLoadedOldestEntry: true,
              },
            },
          });
        });
      });

      describe('clearAccountTransactionHistory', () => {
        it('resets all address transaction histories for an account', () => {
          const state = reducers.cardanoContext(
            {
              ...initialState,
              accountTransactionHistory: {
                // this should be removed
                [cardanoAccount2Addr1.accountId]: {
                  [cardanoAccount2Addr1.address]: {
                    transactionHistory: [exampleHistoryItem],
                    hasLoadedOldestEntry: false,
                  },
                },
                // the one to keep
                [cardanoAccount1Addr.accountId]: {
                  [cardanoAccount1Addr.address]: {
                    transactionHistory: [exampleHistoryItem],
                    hasLoadedOldestEntry: false,
                  },
                },
              },
            },
            actions.cardanoContext.clearAccountTransactionHistory({
              accountId: cardanoAccount2Addr2.accountId,
            }),
          );
          expect(state.accountTransactionHistory).toStrictEqual({
            [cardanoAccount1Addr.accountId]: {
              [cardanoAccount1Addr.address]: {
                transactionHistory: [exampleHistoryItem],
                hasLoadedOldestEntry: false,
              },
            },
          });
        });
      });

      describe('clearAllTransactionHistories', () => {
        it('resets transaction histories for all accounts', () => {
          const state = reducers.cardanoContext(
            {
              ...initialState,
              accountTransactionHistory: {
                [cardanoAccount1Addr.accountId]: {
                  [cardanoAccount1Addr.address]: {
                    transactionHistory: [exampleHistoryItem],
                    hasLoadedOldestEntry: false,
                  },
                },
                [cardanoAccount2Addr2.accountId]: {
                  [cardanoAccount2Addr1.address]: {
                    transactionHistory: [exampleHistoryItem],
                    hasLoadedOldestEntry: false,
                  },
                  [cardanoAccount2Addr2.address]: {
                    transactionHistory: [exampleHistoryItem],
                    hasLoadedOldestEntry: false,
                  },
                },
              },
            },
            actions.cardanoContext.clearAllTransactionHistories(),
          );
          expect(state.accountTransactionHistory).toStrictEqual(
            initialState.accountTransactionHistory,
          );
        });
      });
    });
  });

  describe('reducers (UTxOs)', () => {
    it('setAccountUtxos sets utxos per account', () => {
      const accountId1 = AccountId('acc1');
      const accountId2 = AccountId('acc2');

      const state1 = reducers.cardanoContext(
        initialState,
        actions.cardanoContext.setAccountUtxos({
          accountId: accountId1,
          utxos: [utxo1],
        }),
      );
      const state2 = reducers.cardanoContext(
        state1,
        actions.cardanoContext.setAccountUtxos({
          accountId: accountId2,
          utxos: [utxo2],
        }),
      );

      const result = selectors.cardanoContext.selectAccountUtxos({
        cardanoContext: state2,
      });

      expect(result).toEqual({
        [accountId1]: [utxo1],
        [accountId2]: [utxo2],
      });
    });

    describe('setAccountUnspendableUtxos', () => {
      it('sets unspendable utxos per account', () => {
        const accountId1 = AccountId('acc1');
        const accountId2 = AccountId('acc2');

        const state1 = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountUnspendableUtxos({
            accountId: accountId1,
            utxos: [utxo1],
          }),
        );
        const state2 = reducers.cardanoContext(
          state1,
          actions.cardanoContext.setAccountUnspendableUtxos({
            accountId: accountId2,
            utxos: [utxo2],
          }),
        );

        const result = selectors.cardanoContext.selectAccountUnspendableUtxos({
          cardanoContext: state2,
        });

        expect(result).toEqual({
          [accountId1]: [utxo1],
          [accountId2]: [utxo2],
        });
      });

      it('replaces existing unspendable utxos for the same account', () => {
        const accountId = AccountId('acc1');

        const state1 = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountUnspendableUtxos({
            accountId,
            utxos: [utxo1],
          }),
        );
        const state2 = reducers.cardanoContext(
          state1,
          actions.cardanoContext.setAccountUnspendableUtxos({
            accountId,
            utxos: [utxo2],
          }),
        );

        const result = selectors.cardanoContext.selectAccountUnspendableUtxos({
          cardanoContext: state2,
        });

        expect(result).toEqual({
          [accountId]: [utxo2],
        });
      });

      it('sets empty array to clear unspendable utxos for an account', () => {
        const accountId = AccountId('acc1');

        const state1 = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountUnspendableUtxos({
            accountId,
            utxos: [utxo1, utxo2],
          }),
        );
        const state2 = reducers.cardanoContext(
          state1,
          actions.cardanoContext.setAccountUnspendableUtxos({
            accountId,
            utxos: [],
          }),
        );

        const result = selectors.cardanoContext.selectAccountUnspendableUtxos({
          cardanoContext: state2,
        });

        expect(result).toEqual({
          [accountId]: [],
        });
      });

      it('preserves unspendable utxos for other accounts when updating one', () => {
        const accountId1 = AccountId('acc1');
        const accountId2 = AccountId('acc2');

        const state1 = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountUnspendableUtxos({
            accountId: accountId1,
            utxos: [utxo1],
          }),
        );
        const state2 = reducers.cardanoContext(
          state1,
          actions.cardanoContext.setAccountUnspendableUtxos({
            accountId: accountId2,
            utxos: [utxo2],
          }),
        );
        const state3 = reducers.cardanoContext(
          state2,
          actions.cardanoContext.setAccountUnspendableUtxos({
            accountId: accountId1,
            utxos: [utxo1, utxo2],
          }),
        );

        const result = selectors.cardanoContext.selectAccountUnspendableUtxos({
          cardanoContext: state3,
        });

        expect(result).toEqual({
          [accountId1]: [utxo1, utxo2],
          [accountId2]: [utxo2],
        });
      });
    });
  });

  describe('reducers (AccountTransactionsTotal)', () => {
    describe('setAccountTransactionsTotal', () => {
      it('sets transactions total for multiple accounts', () => {
        const accountId1 = AccountId('acc1');
        const accountId2 = AccountId('acc2');
        const total1 = 42;
        const total2 = 100;

        const state1 = reducers.cardanoContext(
          initialState,
          actions.cardanoContext.setAccountTransactionsTotal({
            accountId: accountId1,
            total: total1,
          }),
        );

        const state2 = reducers.cardanoContext(
          state1,
          actions.cardanoContext.setAccountTransactionsTotal({
            accountId: accountId2,
            total: total2,
          }),
        );

        expect(state2.accountTransactionsTotal).toEqual({
          [accountId1]: total1,
          [accountId2]: total2,
        });
      });

      it('updates existing account transactions total with multiple accounts loaded', () => {
        const accountId1 = AccountId('acc1');
        const accountId2 = AccountId('acc2');
        const accountId3 = AccountId('acc3');
        const total1 = 42;
        const total2 = 100;
        const total3Updated = 200;

        const stateWithMultipleAccounts = {
          ...initialState,
          accountTransactionsTotal: {
            [accountId1]: total1,
            [accountId2]: total2,
            [accountId3]: 150,
          },
        };

        const stateWithUpdatedTotal = reducers.cardanoContext(
          stateWithMultipleAccounts,
          actions.cardanoContext.setAccountTransactionsTotal({
            accountId: accountId3,
            total: total3Updated,
          }),
        );

        expect(stateWithUpdatedTotal.accountTransactionsTotal).toEqual({
          [accountId1]: total1,
          [accountId2]: total2,
          [accountId3]: total3Updated,
        });
      });
    });
  });

  describe('extraReducers', () => {
    describe('removeAccount', () => {
      it('should remove all the cardano context data for the account', () => {
        const accountId = AccountId('accountid1');
        const accountId2 = AccountId('accountid2');
        const walletId = WalletId('wallet1');
        const rewardAccount = CardanoRewardAccount(
          'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
        );

        const state = {
          ...initialState,
          accountTransactionHistory: {
            [accountId]: {
              [cardanoAccount1Addr.address]: {
                transactionHistory: [],
                hasLoadedOldestEntry: false,
              },
            },
            [accountId2]: {
              [cardanoAccount2Addr1.address]: {
                transactionHistory: [],
                hasLoadedOldestEntry: false,
              },
            },
          },
          accountRewardsHistory: {
            [accountId]: [],
            [accountId2]: [],
          },
          accountUtxos: {
            [accountId]: Serializable.to<Cardano.Utxo[]>([]),
            [accountId2]: Serializable.to<Cardano.Utxo[]>([]),
          },
          accountUnspendableUtxos: {
            [accountId]: Serializable.to<Cardano.Utxo[]>([utxo1]),
            [accountId2]: Serializable.to<Cardano.Utxo[]>([utxo2]),
          },
          accountTransactionsTotal: {
            [accountId]: 42,
            [accountId2]: 100,
          },
          accountDelegationsHistory: {
            [accountId]: {
              [rewardAccount]: {
                delegations: { entries: [], hasLoadedOldest: false },
                registrations: { entries: [], hasLoadedOldest: false },
                withdrawals: { entries: [], hasLoadedOldest: false },
              },
            },
            [accountId2]: {
              [rewardAccount]: {
                delegations: { entries: [], hasLoadedOldest: false },
                registrations: { entries: [], hasLoadedOldest: false },
                withdrawals: { entries: [], hasLoadedOldest: false },
              },
            },
          },
          delegationActivities: {
            [accountId]: {
              [rewardAccount]: [
                {
                  accountId,
                  activityId: 'activity1',
                  type: ActivityType.Delegation,
                  timestamp: Timestamp(1000),
                  tokenBalanceChanges: [],
                },
              ],
            },
            [accountId2]: {
              [rewardAccount]: [
                {
                  accountId: accountId2,
                  activityId: 'activity2',
                  type: ActivityType.Registration,
                  timestamp: Timestamp(2000),
                  tokenBalanceChanges: [],
                },
              ],
            },
          },
        } as unknown as CardanoContextSliceState;

        const newState = reducers.cardanoContext(
          state,
          walletsActions.wallets.removeAccount(walletId, accountId),
        );
        expect(newState.accountUtxos).toEqual({
          [accountId2]: Serializable.to<Cardano.Utxo[]>([]),
        });
        expect(
          selectors.cardanoContext.selectAccountUnspendableUtxos({
            cardanoContext: newState,
          }),
        ).toEqual({
          [accountId2]: [utxo2],
        });
        expect(newState.accountTransactionHistory).toEqual({
          [accountId2]: {
            [cardanoAccount2Addr1.address]: {
              transactionHistory: [],
              hasLoadedOldestEntry: false,
            },
          },
        });
        expect(newState.accountRewardsHistory).toEqual({
          [accountId2]: [],
        });
        expect(newState.accountTransactionsTotal).toEqual({
          [accountId2]: 100,
        });
        expect(newState.accountDelegationsHistory).toEqual({
          [accountId2]: {
            [rewardAccount]: {
              delegations: { entries: [], hasLoadedOldest: false },
              registrations: { entries: [], hasLoadedOldest: false },
              withdrawals: { entries: [], hasLoadedOldest: false },
            },
          },
        });
        expect(newState.delegationActivities).toEqual({
          [accountId2]: {
            [rewardAccount]: [
              {
                accountId: accountId2,
                activityId: 'activity2',
                type: ActivityType.Registration,
                timestamp: Timestamp(2000),
                tokenBalanceChanges: [],
              },
            ],
          },
        });
      });
    });

    describe('removeWallet', () => {
      it('should remove all the cardano context data for all accounts in the wallet', () => {
        const accountId = AccountId('accountid1');
        const accountId2 = AccountId('accountid2');
        const accountId3 = AccountId('accountid3');
        const walletId = WalletId('wallet1');
        const rewardAccount = CardanoRewardAccount(
          'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
        );

        const state = {
          ...initialState,
          accountTransactionHistory: {
            [accountId]: {
              [cardanoAccount1Addr.address]: {
                transactionHistory: [],
                hasLoadedOldestEntry: false,
              },
            },
            [accountId2]: {
              [cardanoAccount2Addr1.address]: {
                transactionHistory: [],
                hasLoadedOldestEntry: false,
              },
            },
            [accountId3]: {
              [cardanoAccount1Addr.address]: {
                transactionHistory: [],
                hasLoadedOldestEntry: false,
              },
            },
          },
          accountRewardsHistory: {
            [accountId]: [],
            [accountId2]: [],
            [accountId3]: [],
          },
          accountUtxos: {
            [accountId]: Serializable.to<Cardano.Utxo[]>([]),
            [accountId2]: Serializable.to<Cardano.Utxo[]>([]),
            [accountId3]: Serializable.to<Cardano.Utxo[]>([]),
          },
          accountTransactionsTotal: {
            [accountId]: 42,
            [accountId2]: 100,
            [accountId3]: 50,
          },
          accountDelegationsHistory: {
            [accountId]: {
              [rewardAccount]: {
                delegations: { entries: [], hasLoadedOldest: false },
                registrations: { entries: [], hasLoadedOldest: false },
                withdrawals: { entries: [], hasLoadedOldest: false },
              },
            },
            [accountId2]: {
              [rewardAccount]: {
                delegations: { entries: [], hasLoadedOldest: false },
                registrations: { entries: [], hasLoadedOldest: false },
                withdrawals: { entries: [], hasLoadedOldest: false },
              },
            },
            [accountId3]: {
              [rewardAccount]: {
                delegations: { entries: [], hasLoadedOldest: false },
                registrations: { entries: [], hasLoadedOldest: false },
                withdrawals: { entries: [], hasLoadedOldest: false },
              },
            },
          },
          delegationActivities: {
            [accountId]: {
              [rewardAccount]: [
                {
                  accountId,
                  activityId: 'activity1',
                  type: ActivityType.Delegation,
                  timestamp: Timestamp(1000),
                  tokenBalanceChanges: [],
                },
              ],
            },
            [accountId2]: {
              [rewardAccount]: [
                {
                  accountId: accountId2,
                  activityId: 'activity2',
                  type: ActivityType.Registration,
                  timestamp: Timestamp(2000),
                  tokenBalanceChanges: [],
                },
              ],
            },
            [accountId3]: {
              [rewardAccount]: [
                {
                  accountId: accountId3,
                  activityId: 'activity3',
                  type: ActivityType.Withdrawal,
                  timestamp: Timestamp(3000),
                  tokenBalanceChanges: [],
                },
              ],
            },
          },
        } as unknown as CardanoContextSliceState;

        const newState = reducers.cardanoContext(
          state,
          walletsActions.wallets.removeWallet(walletId, [
            accountId,
            accountId2,
          ]),
        );

        // accountId and accountId2 should be removed, accountId3 should remain
        expect(newState.accountUtxos).toEqual({
          [accountId3]: Serializable.to<Cardano.Utxo[]>([]),
        });
        expect(newState.accountTransactionHistory).toEqual({
          [accountId3]: {
            [cardanoAccount1Addr.address]: {
              transactionHistory: [],
              hasLoadedOldestEntry: false,
            },
          },
        });
        expect(newState.accountRewardsHistory).toEqual({
          [accountId3]: [],
        });
        expect(newState.accountTransactionsTotal).toEqual({
          [accountId3]: 50,
        });
        expect(newState.accountDelegationsHistory).toEqual({
          [accountId3]: {
            [rewardAccount]: {
              delegations: { entries: [], hasLoadedOldest: false },
              registrations: { entries: [], hasLoadedOldest: false },
              withdrawals: { entries: [], hasLoadedOldest: false },
            },
          },
        });
        expect(newState.delegationActivities).toEqual({
          [accountId3]: {
            [rewardAccount]: [
              {
                accountId: accountId3,
                activityId: 'activity3',
                type: ActivityType.Withdrawal,
                timestamp: Timestamp(3000),
                tokenBalanceChanges: [],
              },
            ],
          },
        });
      });
    });

    describe('removeWallet', () => {
      it('should remove account-level unspendable utxos when wallet is removed', () => {
        const walletId1 = WalletId('wallet1');
        const accountId1 = AccountId('wallet1-0-1');
        const accountId2 = AccountId('wallet1-1-1');
        const accountId3 = AccountId('wallet2-0-1');

        const state = {
          ...initialState,
          accountUtxos: {
            [accountId1]: [utxo1],
            [accountId2]: [utxo2],
            [accountId3]: [utxo1],
          },
          accountUnspendableUtxos: {
            [accountId1]: [utxo1],
            [accountId2]: [utxo2],
            [accountId3]: [utxo1],
          },
        } as unknown as CardanoContextSliceState;

        const newState = reducers.cardanoContext(
          state,
          walletsActions.wallets.removeWallet(walletId1, [
            accountId1,
            accountId2,
          ]),
        );

        expect(
          selectors.cardanoContext.selectAccountUnspendableUtxos({
            cardanoContext: newState,
          }),
        ).toEqual({
          [accountId3]: [utxo1],
        });
      });

      it('should remove all account data and account unspendable utxos when wallet is removed', () => {
        const walletId = WalletId('wallet1');
        const accountId1 = AccountId('wallet1-0-1');
        const accountId2 = AccountId('wallet1-1-1');

        const state = {
          ...initialState,
          accountTransactionHistory: {
            [accountId1]: {
              [cardanoAccount1Addr.address]: {
                transactionHistory: [],
                hasLoadedOldestEntry: false,
              },
            },
            [accountId2]: {
              [cardanoAccount2Addr1.address]: {
                transactionHistory: [],
                hasLoadedOldestEntry: false,
              },
            },
          },
          accountRewardsHistory: {
            [accountId1]: [],
            [accountId2]: [],
          },
          accountUtxos: {
            [accountId1]: [utxo1],
            [accountId2]: [utxo2],
          },
          accountUnspendableUtxos: {
            [accountId1]: [utxo1],
            [accountId2]: [utxo2],
          },
          accountTransactionsTotal: {
            [accountId1]: 42,
            [accountId2]: 100,
          },
        } as unknown as CardanoContextSliceState;

        const newState = reducers.cardanoContext(
          state,
          walletsActions.wallets.removeWallet(walletId, [
            accountId1,
            accountId2,
          ]),
        );

        expect(newState.accountTransactionHistory).toEqual({});
        expect(newState.accountRewardsHistory).toEqual({});
        expect(newState.accountUtxos).toEqual({});
        expect(
          selectors.cardanoContext.selectAccountUnspendableUtxos({
            cardanoContext: newState,
          }),
        ).toEqual({});
        expect(newState.accountTransactionsTotal).toEqual({});
      });
    });
  });

  describe('selectors', () => {
    // Define unique transaction IDs
    const txId1 =
      '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2';
    const txId2 =
      '6e812e6da32276e76e7e73e7f15248c15ae24e7bb4e2aca1d985e20aaabc6d67';
    const txId3 =
      '7f812e6da32276e76e7e73e7f15248c15ae24e7bb4e2aca1d985e20aaabc6d68';
    const txId4 =
      '9f812e6da32276e76e7e73e7f15248c15ae24e7bb4e2aca1d985e20aaabc6d69';
    const txId5 =
      '03780eb43e1d09b6e447e440d86f26e3176de825b7c3215c7bab0be9898d9448';
    const txId6 =
      '13780eb43e1d09b6e447e440d86f26e3176de825b7c3215c7bab0be9898d9449';

    // account 1

    const accountId1 = cardanoAccount1Addr.accountId;
    const account1Address = CardanoPaymentAddress(cardanoAccount1Addr.address);

    const account1HistoryItem1: CardanoTransactionHistoryItem =
      createTransactionHistoryItem({
        id: txId1,
        blockTime: 1753969306000, // newest
      });

    const account1HistoryItem2: CardanoTransactionHistoryItem =
      createTransactionHistoryItem({
        id: txId2,
        blockTime: 1740659815000, // oldest
      });

    // account 2

    const accountId2 = cardanoAccount2Addr1.accountId;
    const account2Address1 = CardanoPaymentAddress(
      cardanoAccount2Addr1.address,
    );
    const account2Address2 = CardanoPaymentAddress(
      cardanoAccount2Addr2.address,
    );

    const account2HistoryItem1: CardanoTransactionHistoryItem =
      createTransactionHistoryItem({
        id: Cardano.TransactionId(txId3),
        blockTime: Timestamp(3), // newest
      });

    const account2HistoryItem2: CardanoTransactionHistoryItem =
      createTransactionHistoryItem({
        id: Cardano.TransactionId(txId4),
        blockTime: Timestamp(2),
      });

    const account2HistoryItem3: CardanoTransactionHistoryItem =
      createTransactionHistoryItem({
        id: Cardano.TransactionId(txId5),
        blockTime: Timestamp(1), // oldest
      });

    const account2HistoryItem4: CardanoTransactionHistoryItem =
      createTransactionHistoryItem({
        id: Cardano.TransactionId(txId6),
        blockTime: Timestamp(1),
        txIndex: 1,
      });

    const rewardAccount1 = CardanoRewardAccount(
      'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
    );
    const rewardAccount2 = CardanoRewardAccount(
      'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx',
    );

    const accountReward1 = {
      epoch: Cardano.EpochNo(230),
      rewards: BigNumber(BigInt(1000000)),
      poolId: Cardano.PoolId(
        'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
      ),
    };

    const accountReward2 = {
      epoch: Cardano.EpochNo(229),
      rewards: BigNumber(BigInt(2000000)),
    };

    describe('selectTransactionHistoryGroupedByAccount', () => {
      it('returns empty object when there is no transaction history', () => {
        const state: CardanoContextSliceState = {
          ...initialState,
          accountTransactionHistory: {},
        };

        const accountHistory =
          selectors.cardanoContext.selectTransactionHistoryGroupedByAccount({
            cardanoContext: state,
          });
        expect(accountHistory).toEqual({});
      });

      it('groups and sorts transactions from multiple addresses per account', () => {
        const state: CardanoContextSliceState = {
          ...initialState,
          accountTransactionHistory: {
            [accountId1]: {
              [account1Address]: {
                transactionHistory: [
                  account1HistoryItem1,
                  account1HistoryItem2,
                ],
                hasLoadedOldestEntry: false,
              },
            },
            [accountId2]: {
              [account2Address1]: {
                transactionHistory: [
                  account2HistoryItem1,
                  account2HistoryItem2,
                ],
                hasLoadedOldestEntry: false,
              },
              [account2Address2]: {
                transactionHistory: [
                  // Duplicated transaction present in both account addresses
                  // should be de-duplicated in the result
                  account2HistoryItem2,
                  // should not be in account history because the address with
                  // longest history has only 2 items and so we cannot assume
                  // we know more than 2 history items in total.
                  account2HistoryItem3,
                ],
                hasLoadedOldestEntry: false,
              },
            },
          },
        };

        const accountHistory =
          selectors.cardanoContext.selectTransactionHistoryGroupedByAccount({
            cardanoContext: state,
          });

        // Should group items by account and sort by timestamp
        expect(accountHistory).toEqual({
          [accountId1]: [account1HistoryItem1, account1HistoryItem2],
          // account2HistoryItem2 is de-duplicated
          [accountId2]: [account2HistoryItem1, account2HistoryItem2],
        });
      });

      it('selects all account history items if all addresses are fully loaded', () => {
        const state: CardanoContextSliceState = {
          ...initialState,
          accountTransactionHistory: {
            [accountId2]: {
              [account2Address1]: {
                transactionHistory: [account2HistoryItem1],
                hasLoadedOldestEntry: true,
              },
              [account2Address2]: {
                transactionHistory: [
                  account2HistoryItem2,
                  account2HistoryItem4,
                  account2HistoryItem3,
                ],
                hasLoadedOldestEntry: true,
              },
            },
          },
        };

        const accountHistory =
          selectors.cardanoContext.selectTransactionHistoryGroupedByAccount({
            cardanoContext: state,
          });

        // Should group items by account and sort by timestamp
        expect(accountHistory).toEqual({
          [accountId2]: [
            account2HistoryItem1,
            account2HistoryItem2,
            account2HistoryItem4,
            account2HistoryItem3,
          ],
        });
      });
    });

    describe('selectAccountRewardsHistoryGroupedByAccount', () => {
      it('returns empty object when there is no rewards history', () => {
        const state: CardanoContextSliceState = {
          ...initialState,
          accountRewardsHistory: {},
        };

        const accountRewards =
          selectors.cardanoContext.selectRewardsHistoryGroupedByAccount({
            cardanoContext: state,
          });
        expect(accountRewards).toEqual({});
      });

      it('groups rewards by account', () => {
        const testRewardHistory = {
          [rewardAccount1]: [accountReward1],
          [rewardAccount2]: [accountReward2],
        };

        const state: CardanoContextSliceState = {
          ...initialState,
          accountRewardsHistory: {
            [accountId1]: testRewardHistory,
          },
        };

        const accountRewards =
          selectors.cardanoContext.selectRewardsHistoryGroupedByAccount({
            cardanoContext: state,
          });

        expect(accountRewards).toEqual({
          [accountId1]: [accountReward1, accountReward2],
        });
      });
    });

    describe('selectRewardsHistoryForAccount', () => {
      it('returns empty array when account has no rewards history', () => {
        const state: CardanoContextSliceState = {
          ...initialState,
          accountRewardsHistory: {},
        };

        const rewards = selectors.cardanoContext.selectRewardsHistoryForAccount(
          { cardanoContext: state },
          accountId1,
        );
        expect(rewards).toEqual([]);
      });

      it('returns stable empty reference for missing account', () => {
        const state: CardanoContextSliceState = {
          ...initialState,
          accountRewardsHistory: {},
        };

        const rewards1 =
          selectors.cardanoContext.selectRewardsHistoryForAccount(
            { cardanoContext: state },
            accountId1,
          );
        const rewards2 =
          selectors.cardanoContext.selectRewardsHistoryForAccount(
            { cardanoContext: state },
            accountId1,
          );
        expect(rewards1).toBe(rewards2);
      });

      it('flattens and sorts rewards for a single account', () => {
        const testRewardHistory = {
          [rewardAccount1]: [accountReward1],
          [rewardAccount2]: [accountReward2],
        };

        const state: CardanoContextSliceState = {
          ...initialState,
          accountRewardsHistory: {
            [accountId1]: testRewardHistory,
          },
        };

        const rewards = selectors.cardanoContext.selectRewardsHistoryForAccount(
          { cardanoContext: state },
          accountId1,
        );

        // accountReward1 has epoch 230, accountReward2 has epoch 229
        // Should be sorted descending by epoch
        expect(rewards).toEqual([accountReward1, accountReward2]);
      });

      it('returns stable reference on repeated calls with non-empty result', () => {
        const state: CardanoContextSliceState = {
          ...initialState,
          accountRewardsHistory: {
            [accountId1]: {
              [rewardAccount1]: [accountReward1],
              [rewardAccount2]: [accountReward2],
            },
          },
        };
        const wrappedState = { cardanoContext: state };

        const rewards1 =
          selectors.cardanoContext.selectRewardsHistoryForAccount(
            wrappedState,
            accountId1,
          );
        const rewards2 =
          selectors.cardanoContext.selectRewardsHistoryForAccount(
            wrappedState,
            accountId1,
          );

        expect(rewards1).toBe(rewards2);
      });

      it('preserves reference for account X when querying account Y with same state', () => {
        const state: CardanoContextSliceState = {
          ...initialState,
          accountRewardsHistory: {
            [accountId1]: {
              [rewardAccount1]: [accountReward1],
            },
            [accountId2]: {
              [rewardAccount2]: [accountReward2],
            },
          },
        };
        const wrappedState = { cardanoContext: state };

        const rewards1a =
          selectors.cardanoContext.selectRewardsHistoryForAccount(
            wrappedState,
            accountId1,
          );
        // interleaved call for a different account must not evict
        selectors.cardanoContext.selectRewardsHistoryForAccount(
          wrappedState,
          accountId2,
        );
        const rewards1b =
          selectors.cardanoContext.selectRewardsHistoryForAccount(
            wrappedState,
            accountId1,
          );

        expect(rewards1a).toBe(rewards1b);
      });

      it('preserves reference for account X when a sibling account entry is added to the root map', () => {
        const accountOneEntry = { [rewardAccount1]: [accountReward1] };
        const history1 = {
          [accountId1]: accountOneEntry,
        };
        const history2 = {
          [accountId1]: accountOneEntry,
          [accountId2]: { [rewardAccount2]: [accountReward2] },
        };

        const rewardsFirst =
          selectors.cardanoContext.selectRewardsHistoryForAccount(
            {
              cardanoContext: {
                ...initialState,
                accountRewardsHistory: history1,
              },
            },
            accountId1,
          );
        const rewardsAfterOtherAccountAdded =
          selectors.cardanoContext.selectRewardsHistoryForAccount(
            {
              cardanoContext: {
                ...initialState,
                accountRewardsHistory: history2,
              },
            },
            accountId1,
          );

        // accountId1's sub-map reference is unchanged, so the output must be
        // referentially stable even though the root map got a new reference.
        expect(rewardsFirst).toBe(rewardsAfterOtherAccountAdded);
      });
    });

    describe('selectCombinedTransactionHistory', () => {
      it('returns the combined transaction history', () => {
        const eraSummaries = [
          {
            parameters: {
              epochLength: 21600,
              slotLength: Milliseconds(20000),
            },
            start: {
              slot: 0,
              time: new Date('2022-06-01T00:00:00.000Z'),
            },
          },
          {
            parameters: {
              epochLength: 432000,
              slotLength: Milliseconds(1000),
            },
            start: {
              slot: 86400,
              time: new Date('2022-06-21T00:00:00.000Z'),
            },
          },
          {
            parameters: {
              epochLength: 432000,
              slotLength: Milliseconds(1000),
            },
            start: {
              slot: 518400,
              time: new Date('2022-06-26T00:00:00.000Z'),
            },
          },
          {
            parameters: {
              epochLength: 432000,
              slotLength: Milliseconds(1000),
            },
            start: {
              slot: 950400,
              time: new Date('2022-07-01T00:00:00.000Z'),
            },
          },
          {
            parameters: {
              epochLength: 432000,
              slotLength: Milliseconds(1000),
            },
            start: {
              slot: 1382400,
              time: new Date('2022-07-06T00:00:00.000Z'),
            },
          },
          {
            parameters: {
              epochLength: 432000,
              slotLength: Milliseconds(1000),
            },
            start: {
              slot: 3542400,
              time: new Date('2022-07-31T00:00:00.000Z'),
            },
          },
          {
            parameters: {
              epochLength: 432000,
              slotLength: Milliseconds(1000),
            },
            start: {
              slot: 68774400,
              time: new Date('2024-08-24T00:00:00.000Z'),
            },
          },
        ];

        const cardanoContextState: CardanoContextSliceState = {
          ...initialState,
          accountTransactionHistory: {
            [accountId1]: {
              [account1Address]: {
                transactionHistory: [
                  account1HistoryItem1,
                  account1HistoryItem2,
                ],
                hasLoadedOldestEntry: false,
              },
            },
            [accountId2]: {
              [account2Address1]: {
                transactionHistory: [account2HistoryItem1],
                hasLoadedOldestEntry: true,
              },
              [account2Address2]: {
                transactionHistory: [
                  account2HistoryItem2,
                  account2HistoryItem4,
                  account2HistoryItem3,
                ],
                hasLoadedOldestEntry: true,
              },
            },
          },
          accountRewardsHistory: {
            [accountId1]: {
              [rewardAccount1]: [accountReward1],
              [rewardAccount2]: [accountReward2],
            },
          },
          networkInfo: {
            [testNetwork]: {
              eraSummaries: Serializable.to(eraSummaries),
            },
          },
        };

        const result =
          selectors.cardanoContext.selectCombinedTransactionHistory({
            cardanoContext: cardanoContextState,
            network: {
              networkType: 'testnet',
              initialNetworkType: 'testnet' as const,
              blockchainNetworks: {
                Cardano: { mainnet: testNetwork, testnet: testNetwork },
              },
              testnetOptions: {},
            },
          });

        expect(result).toEqual({
          [accountId1]: [
            accountReward1,
            account1HistoryItem1,
            accountReward2,
            account1HistoryItem2,
          ],
          [accountId2]: [
            account2HistoryItem1,
            account2HistoryItem2,
            account2HistoryItem4,
            account2HistoryItem3,
          ],
        });
      });
    });

    describe('selectAccountUtxos', () => {
      it('returns empty object when there are no utxos for any account', () => {
        const state: CardanoContextSliceState = {
          ...initialState,
          accountUtxos: {},
        } as CardanoContextSliceState;

        const result = selectors.cardanoContext.selectAccountUtxos({
          cardanoContext: state,
        });
        expect(result).toEqual({});
      });

      it('returns utxos for the given account when present', () => {
        const expectedUtxos = {
          [AccountId('acc1')]: [utxo1],
          [AccountId('acc2')]: [utxo2],
        };
        const state: CardanoContextSliceState = {
          ...initialState,
          accountUtxos: {
            [AccountId('acc1')]: Serializable.to([utxo1]),
            [AccountId('acc2')]: Serializable.to([utxo2]),
          },
        };

        const result = selectors.cardanoContext.selectAccountUtxos({
          cardanoContext: state,
        });
        expect(result).toEqual(expectedUtxos);
      });
    });

    describe('selectAccountUnspendableUtxos', () => {
      it('returns empty object when there are no unspendable utxos for any account', () => {
        const state: CardanoContextSliceState = {
          ...initialState,
          accountUnspendableUtxos: Serializable.to({}),
        } as CardanoContextSliceState;

        const result = selectors.cardanoContext.selectAccountUnspendableUtxos({
          cardanoContext: state,
        });
        expect(result).toEqual({});
      });

      it('returns unspendable utxos for the given account when present', () => {
        const accountId1 = AccountId('acc1');
        const accountId2 = AccountId('acc2');
        const accountUnspendableUtxos = {
          [accountId1]: [utxo1],
          [accountId2]: [utxo2],
        };
        const state: CardanoContextSliceState = {
          ...initialState,
          accountUnspendableUtxos: Serializable.to(accountUnspendableUtxos),
        } as CardanoContextSliceState;

        const result = selectors.cardanoContext.selectAccountUnspendableUtxos({
          cardanoContext: state,
        });
        expect(result).toEqual(accountUnspendableUtxos);
      });
    });

    describe('selectAccountTransactionsTotal', () => {
      it('returns empty object when there are no transactions totals for any account', () => {
        const state: CardanoContextSliceState = {
          ...initialState,
          accountTransactionsTotal: {},
        };

        const result = selectors.cardanoContext.selectAccountTransactionsTotal({
          cardanoContext: state,
        });
        expect(result).toEqual({});
      });

      it('returns transactions totals for multiple accounts when present', () => {
        const accountTransactionsTotal = {
          [AccountId('acc1')]: 42,
          [AccountId('acc2')]: 100,
          [AccountId('acc3')]: 200,
        };
        const state: CardanoContextSliceState = {
          ...initialState,
          accountTransactionsTotal,
        };

        const result = selectors.cardanoContext.selectAccountTransactionsTotal({
          cardanoContext: state,
        });
        expect(result).toEqual(accountTransactionsTotal);
      });
    });

    describe('selectStakingStatus', () => {
      const testWalletId = WalletId('test-wallet');
      const preprodNetworkMagic = Cardano.NetworkMagics.Preprod;
      const previewNetworkMagic = Cardano.NetworkMagics.Preview;

      type SelectStakingStatusState = Parameters<
        typeof selectors.cardanoContext.selectStakingStatus
      >[0];

      const createWalletWithAccounts = (
        walletId: WalletId,
        accounts: Array<{ accountId: AccountId; networkMagic: number }>,
      ): WalletEntity =>
        ({
          walletId,
          metadata: { name: 'Test Wallet', order: 0 },
          type: WalletType.InMemory,
          blockchainSpecific: {},
          accounts: accounts.map(({ accountId, networkMagic }) => ({
            accountId,
            walletId,
            accountType: 'InMemory',
            blockchainName: 'Cardano',
            networkType: 'testnet' as const,
            blockchainNetworkId: CardanoNetworkId(networkMagic),
            metadata: { name: 'Account' },
            blockchainSpecific: {},
          })),
        } as unknown as WalletEntity);

      const createStateWithNetwork = (
        rewardAccountDetails: AccountRewardAccountDetailsMap,
        {
          networkType = 'testnet' as NetworkType,
          walletAccounts = Object.keys(rewardAccountDetails).map(accountId => {
            const parts = String(accountId).split('-');
            const networkMagic = Number(parts[parts.length - 1]);
            return { accountId: AccountId(accountId), networkMagic };
          }),
          hasEverSynced = true,
        }: {
          networkType?: NetworkType;
          walletAccounts?: Array<{
            accountId: AccountId;
            networkMagic: number;
          }>;
          hasEverSynced?: boolean;
        } = {},
      ) => {
        const walletsEntities: Record<string, WalletEntity> =
          walletAccounts.length > 0
            ? {
                [String(testWalletId)]: createWalletWithAccounts(
                  testWalletId,
                  walletAccounts,
                ),
              }
            : {};
        const syncStatusByAccount: Record<string, unknown> = {};
        if (hasEverSynced && walletAccounts.length > 0) {
          syncStatusByAccount[String(walletAccounts[0].accountId)] = {
            lastSuccessfulSync: 1_000_000,
          };
        }
        return {
          cardanoContext: {
            ...initialState,
            rewardAccountDetails:
              Serializable.to<AccountRewardAccountDetailsMap>(
                rewardAccountDetails,
              ),
          },
          network: {
            networkType,
            blockchainNetworks: {
              Cardano: {
                mainnet: CardanoNetworkId(Cardano.NetworkMagics.Mainnet),
                testnet: CardanoNetworkId(preprodNetworkMagic),
              },
            },
          },
          wallets: {
            ids: Object.keys(walletsEntities),
            entities: walletsEntities,
          },
          sync: { syncStatusByAccount },
        } as unknown as SelectStakingStatusState;
      };

      it('returns loading status when there are no reward account details', () => {
        const state = createStateWithNetwork(
          {} as AccountRewardAccountDetailsMap,
        );

        const result = selectors.cardanoContext.selectStakingStatus(state);

        expect(result.totalRewardsSum.toString()).toBe('0');
        expect(result.totalStakedAmount.toString()).toBe('0');
        expect(result.totalUnstakedAmount.toString()).toBe('0');
        expect(result.stakingStatus).toBe('loading');
      });

      it('returns loading status when accounts exist but sync has not completed', () => {
        const accountId = CardanoAccountId(
          testWalletId,
          0,
          preprodNetworkMagic,
        );

        const state = createStateWithNetwork(
          {} as AccountRewardAccountDetailsMap,
          {
            walletAccounts: [{ accountId, networkMagic: preprodNetworkMagic }],
            hasEverSynced: false,
          },
        );

        const result = selectors.cardanoContext.selectStakingStatus(state);

        expect(result.totalRewardsSum.toString()).toBe('0');
        expect(result.totalStakedAmount.toString()).toBe('0');
        expect(result.totalUnstakedAmount.toString()).toBe('0');
        expect(result.stakingStatus).toBe('loading');
      });

      it('returns staked status with zeros when accounts exist and sync completed but no reward details', () => {
        const accountId = CardanoAccountId(
          testWalletId,
          0,
          preprodNetworkMagic,
        );

        const state = createStateWithNetwork(
          {} as AccountRewardAccountDetailsMap,
          {
            walletAccounts: [{ accountId, networkMagic: preprodNetworkMagic }],
            hasEverSynced: true,
          },
        );

        const result = selectors.cardanoContext.selectStakingStatus(state);

        expect(result.totalRewardsSum.toString()).toBe('0');
        expect(result.totalStakedAmount.toString()).toBe('0');
        expect(result.totalUnstakedAmount.toString()).toBe('0');
        expect(result.stakingStatus).toBe('staked');
      });

      it('returns loading status when there are no visible accounts', () => {
        const accountId = CardanoAccountId(
          testWalletId,
          0,
          preprodNetworkMagic,
        );
        const rewardAccountDetails: AccountRewardAccountDetailsMap = {
          [accountId]: {
            rewardAccountInfo: {
              isActive: true,
              isRegistered: true,
              rewardsSum: BigNumber(0n),
              controlledAmount: BigNumber(10_000_000n),
              withdrawableAmount: BigNumber(0n),
            },
          },
        };

        const state = createStateWithNetwork(rewardAccountDetails, {
          walletAccounts: [],
        });

        const result = selectors.cardanoContext.selectStakingStatus(state);

        expect(result.stakingStatus).toBe('loading');
      });

      it('returns staked status when any account is actively staking', () => {
        const accountId = CardanoAccountId(
          testWalletId,
          0,
          preprodNetworkMagic,
        );
        const rewardAccountDetails: AccountRewardAccountDetailsMap = {
          [accountId]: {
            rewardAccountInfo: {
              isActive: true,
              isRegistered: true,
              rewardsSum: BigNumber(0n),
              controlledAmount: BigNumber(10_000_000n),
              withdrawableAmount: BigNumber(0n),
            },
          },
        };

        const state = createStateWithNetwork(rewardAccountDetails);

        const result = selectors.cardanoContext.selectStakingStatus(state);

        expect(result.totalRewardsSum.toString()).toBe('0');
        expect(result.totalStakedAmount.toString()).toBe('10000000');
        expect(result.totalUnstakedAmount.toString()).toBe('0');
        expect(result.stakingStatus).toBe('staked');
      });

      it('returns staked status when no accounts are active but rewards have been earned', () => {
        const accountId = CardanoAccountId(
          testWalletId,
          0,
          preprodNetworkMagic,
        );
        const rewardAccountDetails: AccountRewardAccountDetailsMap = {
          [accountId]: {
            rewardAccountInfo: {
              isActive: false,
              isRegistered: false,
              rewardsSum: BigNumber(1_000_000n),
              controlledAmount: BigNumber(10_000_000n),
              withdrawableAmount: BigNumber(0n),
            },
          },
        };

        const state = createStateWithNetwork(rewardAccountDetails);

        const result = selectors.cardanoContext.selectStakingStatus(state);

        expect(result.totalRewardsSum.toString()).toBe('1000000');
        expect(result.totalStakedAmount.toString()).toBe('0');
        expect(result.totalUnstakedAmount.toString()).toBe('10000000');
        expect(result.stakingStatus).toBe('staked');
      });

      it('returns unstaked status when no accounts are active and no rewards earned', () => {
        const accountId = CardanoAccountId(
          testWalletId,
          0,
          preprodNetworkMagic,
        );
        const rewardAccountDetails: AccountRewardAccountDetailsMap = {
          [accountId]: {
            rewardAccountInfo: {
              isActive: false,
              isRegistered: false,
              rewardsSum: BigNumber(0n),
              controlledAmount: BigNumber(10_000_000n),
              withdrawableAmount: BigNumber(0n),
            },
          },
        };

        const state = createStateWithNetwork(rewardAccountDetails);

        const result = selectors.cardanoContext.selectStakingStatus(state);

        expect(result.totalRewardsSum.toString()).toBe('0');
        expect(result.totalStakedAmount.toString()).toBe('0');
        expect(result.totalUnstakedAmount.toString()).toBe('10000000');
        expect(result.stakingStatus).toBe('unstaked');
      });

      it('returns staking totals from multiple accounts with mixed active states', () => {
        const accountId1 = CardanoAccountId(
          testWalletId,
          0,
          preprodNetworkMagic,
        );
        const accountId2 = CardanoAccountId(
          testWalletId,
          1,
          preprodNetworkMagic,
        );
        const rewardAccountDetails: AccountRewardAccountDetailsMap = {
          [accountId1]: {
            rewardAccountInfo: {
              isActive: true,
              isRegistered: true,
              rewardsSum: BigNumber(1_000_000n),
              controlledAmount: BigNumber(10_000_000n),
              withdrawableAmount: BigNumber(0n),
            },
          },
          [accountId2]: {
            rewardAccountInfo: {
              isActive: false,
              isRegistered: false,
              rewardsSum: BigNumber(3_000_000n),
              controlledAmount: BigNumber(30_000_000n),
              withdrawableAmount: BigNumber(0n),
            },
          },
        };

        const state = createStateWithNetwork(rewardAccountDetails);

        const result = selectors.cardanoContext.selectStakingStatus(state);

        // 1_000_000 + 3_000_000 = 4_000_000
        expect(result.totalRewardsSum.toString()).toBe('4000000');
        // Only accountId1 is active: 10_000_000
        expect(result.totalStakedAmount.toString()).toBe('10000000');
        // accountId2: 30_000_000
        expect(result.totalUnstakedAmount.toString()).toBe('30000000');
        // Has active account, so status is staked
        expect(result.stakingStatus).toBe('staked');
      });

      it('filters out accounts from different networks', () => {
        const preprodAccountId = CardanoAccountId(
          testWalletId,
          0,
          preprodNetworkMagic,
        );
        const previewAccountId = CardanoAccountId(
          testWalletId,
          1,
          previewNetworkMagic,
        );
        const rewardAccountDetails: AccountRewardAccountDetailsMap = {
          [preprodAccountId]: {
            rewardAccountInfo: {
              isActive: true,
              isRegistered: true,
              rewardsSum: BigNumber(1_000_000n),
              controlledAmount: BigNumber(10_000_000n),
              withdrawableAmount: BigNumber(0n),
            },
          },
          [previewAccountId]: {
            rewardAccountInfo: {
              isActive: true,
              isRegistered: true,
              rewardsSum: BigNumber(5_000_000n),
              controlledAmount: BigNumber(50_000_000n),
              withdrawableAmount: BigNumber(0n),
            },
          },
        };

        const state = createStateWithNetwork(rewardAccountDetails);

        const result = selectors.cardanoContext.selectStakingStatus(state);

        // Only preprod account should be included (testnet uses preprod)
        expect(result.totalRewardsSum.toString()).toBe('1000000');
        expect(result.totalStakedAmount.toString()).toBe('10000000');
        expect(result.totalUnstakedAmount.toString()).toBe('0');
        expect(result.stakingStatus).toBe('staked');
      });

      it('returns loading status when all accounts are filtered out due to different network', () => {
        // Only preview accounts exist in reward details and wallet; current network is preprod (testnet)
        const previewAccountId = CardanoAccountId(
          testWalletId,
          0,
          previewNetworkMagic,
        );
        const rewardAccountDetails: AccountRewardAccountDetailsMap = {
          [previewAccountId]: {
            rewardAccountInfo: {
              isActive: true,
              isRegistered: true,
              rewardsSum: BigNumber(1_000_000n),
              controlledAmount: BigNumber(10_000_000n),
              withdrawableAmount: BigNumber(0n),
            },
          },
        };

        const state = createStateWithNetwork(rewardAccountDetails, {
          walletAccounts: [
            { accountId: previewAccountId, networkMagic: previewNetworkMagic },
          ],
        });

        const result = selectors.cardanoContext.selectStakingStatus(state);

        // Should return loading, not unstaked, when all accounts are filtered out (preview not visible when preprod selected)
        expect(result.totalRewardsSum.toString()).toBe('0');
        expect(result.totalStakedAmount.toString()).toBe('0');
        expect(result.totalUnstakedAmount.toString()).toBe('0');
        expect(result.stakingStatus).toBe('loading');
      });
    });

    describe('selectDelegationActivities', () => {
      const accountId = AccountId('test1');
      const rewardAccount = CardanoRewardAccount(
        'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
      );

      const networkState: NetworkSliceState = {
        networkType: 'testnet' as const,
        initialNetworkType: 'testnet' as const,
        blockchainNetworks: {
          Cardano: { mainnet: testNetwork, testnet: testNetwork },
        },
        testnetOptions: {},
      };

      const createActivity = (
        activityId: string,
        type: ActivityType,
        timestamp: number,
      ): Activity => ({
        accountId,
        activityId,
        type,
        timestamp: Timestamp(timestamp),
        tokenBalanceChanges: [
          {
            tokenId: TokenId('lovelace'),
            amount: BigNumber(BigInt(1000000)),
          },
        ],
      });

      it('should return empty activities when no data exists', () => {
        const result = selectors.cardanoContext.selectDelegationActivities(
          { cardanoContext: initialState, network: networkState },
          { accountId, rewardAccount },
        );

        expect(result.activities).toEqual([]);
        expect(result.isLoadingActivities).toBe(false);
      });

      it('should return activities from delegationActivities when history is loaded', () => {
        const activities = [
          createActivity('activity1', ActivityType.Delegation, 1000),
          createActivity('activity2', ActivityType.Registration, 2000),
          createActivity('activity3', ActivityType.Withdrawal, 3000),
        ];

        const delegationEntry = {
          activeEpoch: Cardano.EpochNo(100),
          txHash: Cardano.TransactionId(
            '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2',
          ),
          amount: BigNumber(BigInt(1000000)),
          poolId: Cardano.PoolId(
            'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
          ),
        };
        const registrationEntry = {
          txHash: Cardano.TransactionId(
            '6e812e6da32276e76e7e73e7f15248c15ae24e7bb4e2aca1d985e20aaabc6d67',
          ),
          action: 'registered' as const,
        };
        const withdrawalEntry = {
          txHash: Cardano.TransactionId(
            'f0e1d2c3b4a5968778695a4b3c2d1e0f00112233445566778899aabbccddeeff',
          ),
          amount: BigNumber(BigInt(2000000)),
        };

        const mockEraSummaries: EraSummary[] = [
          {
            parameters: {
              epochLength: 432000,
              slotLength: 1 as Milliseconds,
            },
            start: {
              slot: 0,
              time: new Date(0),
            },
          },
        ];

        const state: CardanoContextSliceState = {
          ...initialState,
          accountDelegationsHistory: {
            [accountId]: {
              [rewardAccount]: [
                delegationEntry,
                registrationEntry,
                withdrawalEntry,
              ],
            },
          },
          delegationActivities: {
            [accountId]: {
              [rewardAccount]: activities,
            },
          },
          networkInfo: {
            [testNetwork]: {
              eraSummaries: Serializable.to(mockEraSummaries),
            },
          },
        };

        const result = selectors.cardanoContext.selectDelegationActivities(
          { cardanoContext: state, network: networkState },
          { accountId, rewardAccount },
        );

        expect(result.activities).toHaveLength(3);
        expect(result.isLoadingActivities).toBe(false);
      });

      it('should indicate loading when history entries are more than activities', () => {
        const activities = Array.from({ length: 5 }, (_, index) =>
          createActivity(
            `activity${index}`,
            ActivityType.Delegation,
            1000 + index,
          ),
        );

        const historyEntries = Array.from({ length: 10 }, (_, index) => ({
          activeEpoch: Cardano.EpochNo(100 + index),
          txHash: Cardano.TransactionId(
            `80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb893${String(
              index,
            ).padStart(2, '0')}00`,
          ),
          amount: BigNumber(BigInt(1000000)),
          poolId: Cardano.PoolId(
            'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
          ),
        }));

        const state: CardanoContextSliceState = {
          ...initialState,
          accountDelegationsHistory: {
            [accountId]: {
              [rewardAccount]: historyEntries,
            },
          },
          delegationActivities: {
            [accountId]: {
              [rewardAccount]: activities,
            },
          },
        };

        const result = selectors.cardanoContext.selectDelegationActivities(
          { cardanoContext: state, network: networkState },
          { accountId, rewardAccount },
        );

        // History has 10 entries but only 5 activities, so still loading
        // Activities are not returned when isLoadingActivities is true
        expect(result.activities).toHaveLength(0);
        expect(result.isLoadingActivities).toBe(true);
      });

      it('should not indicate loading when history and activities have same length', () => {
        const activities = [
          createActivity('activity1', ActivityType.Delegation, 1000),
        ];

        const delegationEntry = {
          activeEpoch: Cardano.EpochNo(100),
          txHash: Cardano.TransactionId(
            '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2',
          ),
          amount: BigNumber(BigInt(1000000)),
          poolId: Cardano.PoolId(
            'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
          ),
        };

        const state: CardanoContextSliceState = {
          ...initialState,
          accountDelegationsHistory: {
            [accountId]: {
              [rewardAccount]: [delegationEntry],
            },
          },
          delegationActivities: {
            [accountId]: {
              [rewardAccount]: activities,
            },
          },
        };

        const result = selectors.cardanoContext.selectDelegationActivities(
          { cardanoContext: state, network: networkState },
          { accountId, rewardAccount },
        );

        // History has 1 entry and 1 activity, so not loading
        expect(result.isLoadingActivities).toBe(false);
      });

      it('should return all activities regardless of history length', () => {
        const activities = Array.from({ length: 30 }, (_, index) =>
          createActivity(
            `activity${index}`,
            ActivityType.Delegation,
            1000 + index,
          ),
        );

        const historyEntries = Array.from({ length: 20 }, (_, index) => ({
          activeEpoch: Cardano.EpochNo(100 + index),
          txHash: Cardano.TransactionId(
            `80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb893${String(
              index,
            ).padStart(2, '0')}00`,
          ),
          amount: BigNumber(BigInt(1000000)),
          poolId: Cardano.PoolId(
            'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
          ),
        }));

        const state: CardanoContextSliceState = {
          ...initialState,
          accountDelegationsHistory: {
            [accountId]: {
              [rewardAccount]: historyEntries,
            },
          },
          delegationActivities: {
            [accountId]: {
              [rewardAccount]: activities,
            },
          },
        };

        const result = selectors.cardanoContext.selectDelegationActivities(
          { cardanoContext: state, network: networkState },
          { accountId, rewardAccount },
        );

        // History has 20 entries but 30 activities, so still loading
        // Activities are not returned when isLoadingActivities is true
        expect(result.activities).toHaveLength(0);
        expect(result.isLoadingActivities).toBe(true);
      });

      it('should merge rewards with activities when eraSummaries are available', () => {
        const activities = [
          createActivity('activity1', ActivityType.Delegation, 2000),
        ];

        const delegationEntry = {
          activeEpoch: Cardano.EpochNo(100),
          txHash: Cardano.TransactionId(
            '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2',
          ),
          amount: BigNumber(BigInt(1000000)),
          poolId: Cardano.PoolId(
            'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
          ),
        };

        const mockEraSummaries: EraSummary[] = [
          {
            parameters: {
              epochLength: 432000,
              slotLength: 1 as Milliseconds,
            },
            start: {
              slot: 0,
              time: new Date(0),
            },
          },
        ];

        const mockRewards: Reward[] = [
          {
            epoch: Cardano.EpochNo(100),
            rewards: BigNumber(BigInt(5000000)),
            poolId: Cardano.PoolId(
              'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
            ),
          },
        ];

        const state: CardanoContextSliceState = {
          ...initialState,
          accountDelegationsHistory: {
            [accountId]: {
              [rewardAccount]: [delegationEntry],
            },
          },
          delegationActivities: {
            [accountId]: {
              [rewardAccount]: activities,
            },
          },
          accountRewardsHistory: {
            [accountId]: {
              [rewardAccount]: mockRewards,
            },
          },
          networkInfo: {
            [testNetwork]: {
              eraSummaries: Serializable.to(mockEraSummaries),
            },
          },
        };

        const result = selectors.cardanoContext.selectDelegationActivities(
          { cardanoContext: state, network: networkState },
          { accountId, rewardAccount },
        );

        // Should have activities plus rewards merged
        expect(result.activities.length).toBeGreaterThanOrEqual(1);
        expect(result.isLoadingActivities).toBe(false);
      });

      it('should not merge rewards with activities when isLoadingActivities is true', () => {
        const activities = [
          createActivity('activity1', ActivityType.Delegation, 2000),
        ];

        const delegationEntry1 = {
          activeEpoch: Cardano.EpochNo(100),
          txHash: Cardano.TransactionId(
            '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2',
          ),
          amount: BigNumber(BigInt(1000000)),
          poolId: Cardano.PoolId(
            'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
          ),
        };

        const delegationEntry2 = {
          activeEpoch: Cardano.EpochNo(101),
          txHash: Cardano.TransactionId(
            '90be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c3',
          ),
          amount: BigNumber(BigInt(2000000)),
          poolId: Cardano.PoolId(
            'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
          ),
        };

        const mockEraSummaries: EraSummary[] = [
          {
            parameters: {
              epochLength: 432000,
              slotLength: 1 as Milliseconds,
            },
            start: {
              slot: 0,
              time: new Date(0),
            },
          },
        ];

        const mockRewards: Reward[] = [
          {
            epoch: Cardano.EpochNo(100),
            rewards: BigNumber(BigInt(5000000)),
            poolId: Cardano.PoolId(
              'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
            ),
          },
        ];

        const state: CardanoContextSliceState = {
          ...initialState,
          accountDelegationsHistory: {
            [accountId]: {
              [rewardAccount]: [delegationEntry1, delegationEntry2], // 2 entries
            },
          },
          delegationActivities: {
            [accountId]: {
              [rewardAccount]: activities, // Only 1 activity (still loading)
            },
          },
          accountRewardsHistory: {
            [accountId]: {
              [rewardAccount]: mockRewards,
            },
          },
          networkInfo: {
            [testNetwork]: {
              eraSummaries: Serializable.to(mockEraSummaries),
            },
          },
        };

        const result = selectors.cardanoContext.selectDelegationActivities(
          { cardanoContext: state, network: networkState },
          { accountId, rewardAccount },
        );

        // Should have no activities when isLoadingActivities is true
        // (activities are only returned when eraSummaries && !isLoadingActivities)
        expect(result.activities.length).toBe(0);
        expect(result.isLoadingActivities).toBe(true);
        // Verify no reward activities were added
        expect(
          result.activities.some(
            activity => activity.type === ActivityType.Rewards,
          ),
        ).toBe(false);
      });
    });
  });

  describe('retrySyncRound', () => {
    it('should be a trigger action that does not modify state', () => {
      const stateBefore = { ...initialState };
      const stateAfter = reducers.cardanoContext(
        stateBefore,
        actions.cardanoContext.retrySyncRound(),
      );

      expect(stateAfter).toEqual(stateBefore);
    });

    it('should create action without payload', () => {
      const action = actions.cardanoContext.retrySyncRound();

      expect(action.type).toBe('cardanoContext/retrySyncRound');
      expect(action.payload).toBeUndefined();
    });
  });
});
