import { Cardano } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber, Timestamp } from '@lace-sdk/util';
import { describe, expect, it, vi } from 'vitest';

import { ActivityKind, CardanoRewardAccount } from '../../../src';
import { findMissingActivities } from '../../../src/store/helpers';
import { createTransactionHistoryItem, midnightAddress } from '../../mocks';

import type { Activity } from '@lace-contract/activities';
import type { AnyAddress, Address } from '@lace-contract/addresses';

describe('findMissingActivities', () => {
  // Mock ChainId
  const preprod = Cardano.ChainIds.Preprod;

  // Mock mapRewardToActivity function
  const mockMapRewardToActivity = vi.fn();

  // Mock reward account
  const rewardAccount = CardanoRewardAccount(
    'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
  );

  const address1 =
    'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d';
  const address2 =
    'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl';

  const accountId1 = AccountId('account1');
  const accountId2 = AccountId('account2');

  const txId1 =
    '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2';
  const txId2 =
    '3477c72b0fd0f78281f22c3bb88642ad57c7c45c89c85117d4753ec66b58933b';
  const txId3 =
    '3477c72b0fd0f78281f22c3bb88642ad57c7c45c89c85117d4753ec66b58933c';

  const createAddress = (
    address: string,
    accountId: AccountId,
  ): AnyAddress => ({
    address: address as Address,
    accountId,
    blockchainName: 'Cardano',
    data: {
      networkId: preprod.networkId,
      rewardAccount,
      networkMagic: preprod.networkMagic,
    },
  });

  const createActivity = (id: string): Activity => ({
    accountId: accountId1,
    activityId: id,
    timestamp: Timestamp(Date.now()),
    type: ActivityType.Receive,
    tokenBalanceChanges: [],
  });

  it('returns empty array when there are no history items', () => {
    const result = findMissingActivities({
      addresses: [createAddress(address1, accountId1)],
      transactionHistoryByAccount: {},
      accountRewardsHistoryByAccount: {},
      loadedActivities: {},
      chainId: preprod,
      eraSummaries: [],
      mapRewardToActivity: mockMapRewardToActivity,
      desiredLoadedActivitiesCountPerAccount: {},
    });

    expect(result).toEqual([]);
  });

  it('returns empty array when all activities are already loaded', () => {
    const result = findMissingActivities({
      addresses: [createAddress(address1, accountId1)],
      transactionHistoryByAccount: {
        [accountId1]: [
          createTransactionHistoryItem({ id: txId1, blockTime: Date.now() }),
        ],
      },
      accountRewardsHistoryByAccount: {},
      loadedActivities: {
        [accountId1]: [createActivity(txId1)],
      },
      chainId: preprod,
      eraSummaries: [],
      mapRewardToActivity: mockMapRewardToActivity,
      desiredLoadedActivitiesCountPerAccount: {},
    });

    expect(result).toEqual([]);
  });

  it('returns transactions that need to be loaded when no desired number of activities is set yet', () => {
    const loadedTxId = txId1;
    const notLoadedTxId = txId2;

    const address = createAddress(address1, accountId1);
    const historyItemToLoad = createTransactionHistoryItem({
      id: notLoadedTxId,
      blockTime: Date.now() + 10, // newest
    });
    const historyItemToSkip = createTransactionHistoryItem({
      id: loadedTxId,
      blockTime: Date.now(), // oldest
    });

    const result = findMissingActivities({
      addresses: [address],
      transactionHistoryByAccount: {
        [accountId1]: [historyItemToLoad, historyItemToSkip],
      },
      accountRewardsHistoryByAccount: {},
      loadedActivities: {
        [accountId1]: [createActivity(loadedTxId)],
      },
      chainId: preprod,
      eraSummaries: [],
      mapRewardToActivity: mockMapRewardToActivity,
      desiredLoadedActivitiesCountPerAccount: {},
    });

    expect(result).toEqual([
      {
        kind: ActivityKind.Transaction,
        timestamp: historyItemToLoad.blockTime,
        txId: notLoadedTxId,
        accountId: accountId1,
        rewardAccount,
        accountAddresses: [address.address],
      },
    ]);
  });

  it('returns transactions that need to be loaded respecting the desiredLoadedActivitiesCountPerAccount', () => {
    const address = createAddress(address1, accountId1);
    const historyItemToLoad = createTransactionHistoryItem({
      id: txId1,
      blockTime: Date.now() + 20, // newest
    });
    const historyItemToLoad2 = createTransactionHistoryItem({
      id: txId2,
      blockTime: Date.now() + 10,
    });
    const historyItemToSkip = createTransactionHistoryItem({
      id: txId3,
      blockTime: Date.now(), // oldest
    });

    const result = findMissingActivities({
      addresses: [address],
      transactionHistoryByAccount: {
        [accountId1]: [
          historyItemToLoad,
          historyItemToLoad2,
          historyItemToSkip,
        ],
      },
      accountRewardsHistoryByAccount: {},
      loadedActivities: {
        [accountId1]: [createActivity(txId3)],
      },
      chainId: preprod,
      eraSummaries: [],
      mapRewardToActivity: mockMapRewardToActivity,
      desiredLoadedActivitiesCountPerAccount: {
        [accountId1]: 2,
      },
    });

    expect(result).toEqual([
      {
        kind: ActivityKind.Transaction,
        timestamp: historyItemToLoad.blockTime,
        txId: historyItemToLoad.txId,
        accountId: accountId1,
        rewardAccount,
        accountAddresses: [address.address],
      },
      {
        kind: ActivityKind.Transaction,
        timestamp: historyItemToLoad2.blockTime,
        txId: historyItemToLoad2.txId,
        accountId: accountId1,
        rewardAccount,
        accountAddresses: [address.address],
      },
    ]);
  });

  it('skips accounts without Cardano addresses', () => {
    const result = findMissingActivities({
      addresses: [midnightAddress],
      transactionHistoryByAccount: {
        [accountId1]: [
          createTransactionHistoryItem({ id: txId1, blockTime: Date.now() }),
        ],
      },
      accountRewardsHistoryByAccount: {},
      loadedActivities: {},
      chainId: preprod,
      eraSummaries: [],
      mapRewardToActivity: mockMapRewardToActivity,
      desiredLoadedActivitiesCountPerAccount: {},
    });

    expect(result).toEqual([]);
  });

  it('skips if addresses do not match the network ID', () => {
    const differentNetworkChainId = Cardano.ChainIds.Mainnet;

    const result = findMissingActivities({
      addresses: [createAddress(address1, accountId1)],
      transactionHistoryByAccount: {
        [accountId1]: [
          createTransactionHistoryItem({ id: txId1, blockTime: Date.now() }),
        ],
      },
      accountRewardsHistoryByAccount: {},
      loadedActivities: {},
      chainId: differentNetworkChainId,
      eraSummaries: [],
      mapRewardToActivity: mockMapRewardToActivity,
      desiredLoadedActivitiesCountPerAccount: {},
    });

    expect(result).toEqual([]);
  });

  it('skips if the first address has no reward accounts', () => {
    const addressWithoutRewardAccount: AnyAddress = {
      accountId: accountId1,
      address: address2 as Address,
      blockchainName: 'Cardano',
      data: {
        networkId: preprod.networkId,
        networkMagic: preprod.networkMagic,
      },
    };

    const result = findMissingActivities({
      addresses: [addressWithoutRewardAccount],
      transactionHistoryByAccount: {
        [accountId1]: [
          createTransactionHistoryItem({ id: txId1, blockTime: Date.now() }),
        ],
      },
      accountRewardsHistoryByAccount: {},
      loadedActivities: {},
      chainId: preprod,
      eraSummaries: [],
      mapRewardToActivity: mockMapRewardToActivity,
      desiredLoadedActivitiesCountPerAccount: {},
    });

    expect(result).toEqual([]);
  });

  it('processes multiple accounts correctly', () => {
    const account1TxHistoryItem = createTransactionHistoryItem({
      id: txId1,
      blockTime: 1755180859806,
    });
    const account2TxHistoryItem = createTransactionHistoryItem({
      id: txId2,
      blockTime: 1755180859804,
    });
    const account1Activity = createActivity(txId1);
    const account2Activity = createActivity(txId2);

    const result = findMissingActivities({
      addresses: [
        createAddress(address1, accountId1),
        createAddress(address2, accountId2),
      ],
      transactionHistoryByAccount: {
        [accountId1]: [account1TxHistoryItem],
        [accountId2]: [account2TxHistoryItem],
      },
      accountRewardsHistoryByAccount: {},
      loadedActivities: {},
      chainId: preprod,
      eraSummaries: [],
      mapRewardToActivity: mockMapRewardToActivity,
      desiredLoadedActivitiesCountPerAccount: {},
    });

    expect(result).toEqual([
      {
        kind: ActivityKind.Transaction,
        timestamp: account1TxHistoryItem.blockTime,
        txId: Cardano.TransactionId(account1Activity.activityId),
        accountId: accountId1,
        rewardAccount,
        accountAddresses: [address1],
      },
      {
        kind: ActivityKind.Transaction,
        timestamp: account2TxHistoryItem.blockTime,
        txId: Cardano.TransactionId(account2Activity.activityId),
        accountId: accountId2,
        rewardAccount,
        accountAddresses: [address2],
      },
    ]);
  });

  it('handles multiple addresses for the same account', () => {
    const account1TxHistoryItem = createTransactionHistoryItem({
      id: txId1,
      blockTime: Date.now(),
    });

    const firstAddress = createAddress(address1, accountId1);
    const secondAddress = createAddress(address2, accountId1);

    const result = findMissingActivities({
      addresses: [firstAddress, secondAddress],
      transactionHistoryByAccount: {
        [accountId1]: [account1TxHistoryItem],
      },
      accountRewardsHistoryByAccount: {},
      loadedActivities: {},
      chainId: preprod,
      eraSummaries: [],
      mapRewardToActivity: mockMapRewardToActivity,
      desiredLoadedActivitiesCountPerAccount: {},
    });

    expect(result).toEqual([
      {
        kind: ActivityKind.Transaction,
        timestamp: account1TxHistoryItem.blockTime,
        txId: txId1,
        accountId: accountId1,
        rewardAccount,
        accountAddresses: [firstAddress.address, secondAddress.address],
      },
    ]);
  });

  it('includes rewards that are within transaction history range based on timestamp', () => {
    // Create transaction history with a specific blockTime
    const lastTransactionBlockTime = Timestamp(1000000);
    const transactionHistoryItem = createTransactionHistoryItem({
      id: txId1,
      blockTime: lastTransactionBlockTime,
    });

    // Create mock rewards
    const mockReward1 = {
      epoch: Cardano.EpochNo(100),
      rewards: BigNumber(BigInt(1000n)),
      poolId: Cardano.PoolId(
        'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
      ),
    };

    const mockReward2 = {
      epoch: Cardano.EpochNo(101),
      rewards: BigNumber(BigInt(2000n)),
      poolId: Cardano.PoolId(
        'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
      ),
    };

    // Mock reward activities with different timestamps
    const rewardActivity1: Activity = {
      accountId: accountId1,
      activityId: 'reward-1',
      timestamp: Timestamp(1500000), // After transaction blockTime - should be included
      type: ActivityType.Rewards,
      tokenBalanceChanges: [],
    };

    const rewardActivity2: Activity = {
      accountId: accountId1,
      activityId: 'reward-2',
      timestamp: Timestamp(500000), // Before transaction blockTime - should be filtered out
      type: ActivityType.Rewards,
      tokenBalanceChanges: [],
    };

    // Mock mapRewardToActivity to return different timestamps
    const mockMapRewardToActivityWithTimestamp = vi
      .fn()
      .mockReturnValueOnce(rewardActivity1) // First call returns reward after transaction
      .mockReturnValueOnce(rewardActivity2); // Second call returns reward before transaction

    const result = findMissingActivities({
      addresses: [createAddress(address1, accountId1)],
      transactionHistoryByAccount: {
        [accountId1]: [transactionHistoryItem],
      },
      accountRewardsHistoryByAccount: {
        [accountId1]: [mockReward1, mockReward2],
      },
      loadedActivities: {},
      chainId: preprod,
      eraSummaries: [],
      mapRewardToActivity: mockMapRewardToActivityWithTimestamp,
      desiredLoadedActivitiesCountPerAccount: {},
    });

    // Verify mapRewardToActivity was called for both rewards
    expect(mockMapRewardToActivityWithTimestamp).toHaveBeenCalledTimes(2);
    expect(mockMapRewardToActivityWithTimestamp).toHaveBeenCalledWith({
      accountId: accountId1,
      reward: mockReward1,
      eraSummaries: [],
      rewardAccount,
    });
    expect(mockMapRewardToActivityWithTimestamp).toHaveBeenCalledWith({
      accountId: accountId1,
      reward: mockReward2,
      eraSummaries: [],
      rewardAccount,
    });

    // Should include transaction and only the reward with timestamp after transaction blockTime
    expect(result).toEqual([
      {
        kind: ActivityKind.Reward,
        timestamp: rewardActivity1.timestamp,
        rewardActivity: rewardActivity1,
        accountId: accountId1,
      },
      {
        kind: ActivityKind.Transaction,
        timestamp: lastTransactionBlockTime,
        txId: txId1,
        accountId: accountId1,
        rewardAccount,
        accountAddresses: [address1],
      },
    ]);
  });

  it('excludes rewards that are already loaded', () => {
    const lastTransactionBlockTime = Timestamp(1000000);
    const transactionHistoryItem = createTransactionHistoryItem({
      id: txId1,
      blockTime: lastTransactionBlockTime,
    });

    const mockReward = {
      epoch: Cardano.EpochNo(100),
      rewards: BigNumber(BigInt(1000n)),
      poolId: Cardano.PoolId(
        'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
      ),
    };

    const rewardActivity: Activity = {
      accountId: accountId1,
      activityId: 'reward-1',
      timestamp: Timestamp(1500000), // After transaction blockTime
      type: ActivityType.Rewards,
      tokenBalanceChanges: [],
    };

    const mockMapRewardToActivityWithTimestamp = vi
      .fn()
      .mockReturnValue(rewardActivity);

    const result = findMissingActivities({
      addresses: [createAddress(address1, accountId1)],
      transactionHistoryByAccount: {
        [accountId1]: [transactionHistoryItem],
      },
      accountRewardsHistoryByAccount: {
        [accountId1]: [mockReward],
      },
      loadedActivities: {
        [accountId1]: [
          createActivity(txId1), // Transaction already loaded
          { ...rewardActivity }, // Reward already loaded
        ],
      },
      chainId: preprod,
      eraSummaries: [],
      mapRewardToActivity: mockMapRewardToActivityWithTimestamp,
      desiredLoadedActivitiesCountPerAccount: {},
    });

    // Should return empty array since both transaction and reward are already loaded
    expect(result).toEqual([]);
  });

  it('excludes confirmed transactions but includes pending ones for replacement', () => {
    const address = createAddress(address1, accountId1);
    const confirmedTxHistoryItem = createTransactionHistoryItem({
      id: txId1,
      blockTime: Date.now() + 10,
    });
    const pendingTxHistoryItem = createTransactionHistoryItem({
      id: txId2,
      blockTime: Date.now(),
    });

    // One confirmed activity and one pending activity
    const confirmedActivity: Activity = {
      accountId: accountId1,
      activityId: txId1,
      timestamp: Timestamp(Date.now()),
      type: ActivityType.Send, // Confirmed
      tokenBalanceChanges: [],
    };
    const pendingActivity: Activity = {
      accountId: accountId1,
      activityId: txId2,
      timestamp: Timestamp(Date.now()),
      type: ActivityType.Pending,
      tokenBalanceChanges: [],
    };

    const result = findMissingActivities({
      addresses: [address],
      transactionHistoryByAccount: {
        [accountId1]: [confirmedTxHistoryItem, pendingTxHistoryItem],
      },
      accountRewardsHistoryByAccount: {},
      loadedActivities: {
        [accountId1]: [confirmedActivity, pendingActivity],
      },
      chainId: preprod,
      eraSummaries: [],
      mapRewardToActivity: mockMapRewardToActivity,
      desiredLoadedActivitiesCountPerAccount: {},
    });

    // Should only return the transaction that exists as pending (txId2)
    // The confirmed one (txId1) should be excluded
    expect(result).toEqual([
      {
        kind: ActivityKind.Transaction,
        timestamp: pendingTxHistoryItem.blockTime,
        txId: txId2,
        accountId: accountId1,
        rewardAccount,
        accountAddresses: [address.address],
      },
    ]);
  });
});
