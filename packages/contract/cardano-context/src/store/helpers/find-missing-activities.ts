import {
  ACTIVITIES_PER_PAGE,
  ActivityType,
  type Activity,
} from '@lace-contract/activities';
import { AccountId } from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-sdk/util';

import { ActivityKind } from '../../types';
import { CardanoPaymentAddress } from '../../types';

import { filterCardanoAddressesForNetwork } from './group-cardano-addresses-by-account';
import {
  isRewardActivity,
  type MapRewardToActivityParams,
} from './map-reward-to-activity';

import type {
  CardanoRewardAccount,
  CardanoAccountToRewardsMap,
  CardanoAccountTransactionsHistoryMap,
  CardanoRewardActivity,
} from '../../types';
import type { Cardano } from '@cardano-sdk/core';
import type { EraSummary } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';

export type FindMissingActivitiesParams = {
  addresses: AnyAddress[];
  transactionHistoryByAccount: CardanoAccountTransactionsHistoryMap;
  accountRewardsHistoryByAccount: CardanoAccountToRewardsMap;
  loadedActivities: Record<string, Activity[]>;
  chainId: Cardano.ChainId;
  eraSummaries: readonly EraSummary[];
  mapRewardToActivity: (
    params: MapRewardToActivityParams,
  ) => CardanoRewardActivity;
  desiredLoadedActivitiesCountPerAccount: Record<AccountId, number>;
};

export type MissingTransactionData = {
  kind: ActivityKind.Transaction;
  timestamp: Timestamp;
  txId: Cardano.TransactionId;
  accountId: AccountId;
  rewardAccount: CardanoRewardAccount;
  accountAddresses: CardanoPaymentAddress[];
};

export type MissingRewardData = {
  kind: ActivityKind.Reward;
  timestamp: Timestamp;
  rewardActivity: CardanoRewardActivity;
  accountId: AccountId;
};

export type MissingActivityData = MissingRewardData | MissingTransactionData;

/**
 * Finds missing activities (transactions and rewards) that need to be loaded for Cardano accounts.
 *
 * This function determines which activities from the history need to be loaded
 * by comparing them with the currently loaded activities. It includes both
 * transactions and reward activities that fall within the transaction history range.
 * It also validates that the account has valid Cardano addresses and a reward account.
 *
 * @param {Object} params - The parameters for finding activities to load
 * @param {AnyAddress[]} params.addresses - All loaded addresses
 * @param {CardanoAccountTransactionsHistoryMap} params.transactionHistoryByAccount - The loaded history items per account
 * @param {CardanoAccountToRewardsMap} params.accountRewardsHistoryByAccount - The loaded reward history items per account
 * @param {Record<AccountId, Activity[]>} params.loadedActivities - The already loaded activities
 * @param {Cardano.ChainId} params.chainId - The chain ID to filter addresses
 * @param {EraSummary[]} params.eraSummaries - Era summaries for reward mapping
 * @param {Record<AccountId, number>} params.desiredLoadedActivitiesCountPerAccount - The desired number of activities to load per account
 * @returns {MissingActivityData[]} The missing activities to load (transactions and rewards)
 */
export const findMissingActivities = ({
  addresses,
  transactionHistoryByAccount,
  accountRewardsHistoryByAccount,
  loadedActivities,
  chainId,
  eraSummaries,
  mapRewardToActivity,
  desiredLoadedActivitiesCountPerAccount,
}: FindMissingActivitiesParams): MissingActivityData[] => {
  const missingActivities: MissingActivityData[] = [];

  Object.entries(transactionHistoryByAccount).forEach(
    ([accountId, historyItems]) => {
      const missingAccountActivities: MissingActivityData[] = [];
      // No history, nothing to load
      if (historyItems.length === 0) return [];

      const cardanoAccountAddresses = filterCardanoAddressesForNetwork(
        addresses,
        chainId,
      ).filter(a => a.accountId === accountId);

      // only proceed if this is a Cardano account
      if (cardanoAccountAddresses.length === 0) return;

      // only proceed if there is a reward account
      // TODO: probably need to improve this check
      const rewardAccount = cardanoAccountAddresses[0].data?.rewardAccount;
      if (rewardAccount === undefined) return;

      // Exclude pending activities so confirmed transactions can replace them
      const loadedAccountActivityIds = (loadedActivities[accountId] ?? [])
        .filter(a => a.type !== ActivityType.Pending)
        .map(a => a.activityId);

      const historyItemsActivities = historyItems.map<MissingActivityData>(
        a => ({
          kind: ActivityKind.Transaction,
          timestamp: Timestamp(a.blockTime),
          txId: a.txId,
          accountId: AccountId(accountId),
          rewardAccount,
          accountAddresses: cardanoAccountAddresses.map(a =>
            CardanoPaymentAddress(a.address),
          ),
        }),
      );

      const accountRewards =
        accountRewardsHistoryByAccount?.[AccountId(accountId)] || [];
      const accountRewardsActivities = accountRewards.map(reward =>
        mapRewardToActivity({
          reward,
          eraSummaries,
          rewardAccount,
          accountId: AccountId(accountId),
        }),
      );
      const lastHistoryItem = historyItems[historyItems.length - 1];
      const allRewardsTillLastHistoryItem = accountRewardsActivities
        .filter(
          rewardActivity =>
            rewardActivity.timestamp > lastHistoryItem.blockTime,
        )
        .map<MissingRewardData>(rewardActivity => ({
          kind: ActivityKind.Reward,
          timestamp: rewardActivity.timestamp,
          rewardActivity,
          accountId: AccountId(accountId),
        }));

      const allActivitiesLimitedByDesiredCount = [
        ...historyItemsActivities,
        ...allRewardsTillLastHistoryItem,
      ]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(
          0,
          desiredLoadedActivitiesCountPerAccount[AccountId(accountId)] ??
            // fallback to ACTIVITIES_PER_PAGE if desiredLoadedActivitiesCountPerAccount is not set
            // in case we haven't loaded older activities but started polling newer ones
            ACTIVITIES_PER_PAGE,
        );

      missingAccountActivities.push(
        ...allActivitiesLimitedByDesiredCount.filter(
          activity =>
            !loadedAccountActivityIds.includes(
              isRewardActivity(activity)
                ? activity.rewardActivity.activityId
                : activity.txId,
            ),
        ),
      );

      missingActivities.push(...missingAccountActivities);
    },
  );
  return missingActivities.sort((a, b) => b.timestamp - a.timestamp);
};
