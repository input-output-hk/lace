import { markParameterizedSelector } from '@lace-contract/module';
import { networkSelectors } from '@lace-contract/network';
import { selectHasEverSynced } from '@lace-contract/sync';
import { tokensSelectors } from '@lace-contract/tokens';
import {
  AccountId,
  walletsActions,
  walletsSelectors,
} from '@lace-contract/wallet-repo';
import { Serializable } from '@lace-lib/util-store';
import { createAction, createSelector, createSlice } from '@reduxjs/toolkit';
import BigNumber from 'bignumber.js';
import flatMap from 'lodash/flatMap';
import pick from 'lodash/pick';
import uniqBy from 'lodash/uniqBy';

import { filterSpendableUtxos, getEligibleCollateralUtxo } from '../util';
import { CardanoNetworkId } from '../value-objects';

import {
  collateralFlowReducers,
  collateralFlowActions,
  collateralFlowSelectors,
} from './collateral-flow/slice';
import { getRewardSpendableDate, mapRewardToActivity } from './helpers';

import type {
  AccountRewardAccountDetailsMap,
  CardanoAccountAddressHistoryMap,
  CardanoAccountToRewardAccountsMap,
  CardanoAccountToRewardsMap,
  CardanoAccountTransactionsHistoryMap,
  CardanoRewardAccount,
  CardanoRewardAccountToRewardMap,
  CardanoTransactionHistoryItem,
  RequiredProtocolParameters,
  Reward,
  RewardAccountDetails,
  CardanoPaymentAddress,
  AccountUtxoMap,
  AccountUnspendableUtxoMap,
  CardanoBip32AccountProps,
  CardanoMultiSigAccountProps,
  CardanoAccountToDelegationAccountsMap,
  DelegationInfo,
  RegistrationInfo,
  WithdrawalInfo,
} from '../types';
import type { CardanoTxId } from '../value-objects';
import type { Cardano, EraSummary, ProviderFailure } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type { TokenId } from '@lace-contract/tokens';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { HexBytes } from '@lace-sdk/util';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

export type CardanoNetworkInfo = {
  tip?: Cardano.Tip;
  protocolParameters?: RequiredProtocolParameters;
  eraSummaries?: Serializable<EraSummary[]>;
};

export type CardanoContextSliceState = {
  accountTransactionHistory: CardanoAccountAddressHistoryMap;
  accountRewardsHistory: CardanoAccountToRewardAccountsMap;
  accountDelegationsHistory: CardanoAccountToDelegationAccountsMap;
  networkInfo: Partial<Record<CardanoNetworkId, CardanoNetworkInfo>>;
  accountUtxos: Partial<Record<AccountId, Serializable<Cardano.Utxo[]>>>;
  accountUnspendableUtxos: Partial<
    Record<AccountId, Serializable<Cardano.Utxo[]>>
  >;
  accountTransactionsTotal: Record<AccountId, number>;
  rewardAccountDetails: Partial<
    Record<AccountId, Serializable<RewardAccountDetails>>
  >;
  delegationActivities: Record<
    AccountId,
    Record<CardanoRewardAccount, Activity[]>
  >;
  delegationErrors: Record<
    AccountId,
    Record<CardanoRewardAccount, ProviderFailure>
  >;
};

export const initialState: CardanoContextSliceState = {
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

/** Stable fallbacks for slice selectors used as Reselect inputs (dev stability checks). */
const EMPTY_ACCOUNT_TRANSACTIONS_TOTAL =
  {} as CardanoContextSliceState['accountTransactionsTotal'];
const EMPTY_DELEGATION_ACTIVITIES =
  {} as CardanoContextSliceState['delegationActivities'];
const EMPTY_DELEGATION_ERRORS =
  {} as CardanoContextSliceState['delegationErrors'];
const EMPTY_REWARDS: Reward[] = [];

/**
 * Returns the timestamp of a history item.
 * If the item is a transaction, returns the blockTime.
 * If the item is a reward, returns the reward spendable date.
 * @param item - The history item.
 * @param eraSummaries - The era summaries.
 * @returns The timestamp of the history item.
 */
const getHistoryItemTimestamp = (
  item: CardanoTransactionHistoryItem | Reward,
  eraSummaries: readonly EraSummary[],
): number => {
  if ('blockTime' in item) {
    return item.blockTime;
  }
  return getRewardSpendableDate(item.epoch, eraSummaries).getTime();
};

const slice = createSlice({
  name: 'cardanoContext',
  initialState,
  reducers: {
    /**
     * Sets the total transactions per account.
     */
    setAccountTransactionsTotal: (
      state,
      {
        payload,
      }: Readonly<PayloadAction<{ accountId: AccountId; total: number }>>,
    ) => {
      state.accountTransactionsTotal[payload.accountId] = payload.total;
    },
    setTip: (
      state,
      {
        payload: { tip, network },
      }: PayloadAction<{ tip: Cardano.Tip; network: CardanoNetworkId }>,
    ) => {
      state.networkInfo[network] ||= {};
      state.networkInfo[network].tip = tip;
    },
    setProtocolParameters: (
      state,
      {
        payload: { protocolParameters, network },
      }: PayloadAction<{
        protocolParameters: RequiredProtocolParameters;
        network: CardanoNetworkId;
      }>,
    ) => {
      state.networkInfo[network] ||= {};
      state.networkInfo[network].protocolParameters = pick(protocolParameters, [
        'coinsPerUtxoByte',
        'collateralPercentage',
        'dRepDeposit',
        'maxTxSize',
        'maxValueSize',
        'minFeeCoefficient',
        'minFeeConstant',
        'minFeeRefScriptCostPerByte',
        'poolDeposit',
        'prices',
        'stakeKeyDeposit',
        'poolInfluence',
        'maxCollateralInputs',
        'desiredNumberOfPools',
        'monetaryExpansion',
      ]);
    },
    setEraSummaries: {
      reducer: (
        state,
        {
          payload: { network, eraSummaries },
        }: PayloadAction<{
          network: CardanoNetworkId;
          eraSummaries: Serializable<EraSummary[]>;
        }>,
      ) => {
        state.networkInfo[network] ||= {};
        state.networkInfo[network].eraSummaries = eraSummaries;
      },
      prepare: ({
        network,
        eraSummaries,
      }: {
        network: CardanoNetworkId;
        eraSummaries: EraSummary[];
      }) => ({
        payload: {
          network,
          eraSummaries: Serializable.to(eraSummaries),
        },
      }),
    },
    setAccountRewardsHistory: (
      state,
      {
        payload,
      }: Readonly<
        PayloadAction<{
          accountId: AccountId;
          rewardsHistory: CardanoRewardAccountToRewardMap;
        }>
      >,
    ) => {
      const { accountId, rewardsHistory } = payload;
      if (!state.accountRewardsHistory) {
        state.accountRewardsHistory = {};
      }
      state.accountRewardsHistory[accountId] = rewardsHistory;
    },
    setAccountDelegationsHistory: (
      state,
      {
        payload,
      }: Readonly<
        PayloadAction<{
          accountId: AccountId;
          rewardAccount: CardanoRewardAccount;
          items: (DelegationInfo | RegistrationInfo | WithdrawalInfo)[];
        }>
      >,
    ) => {
      const { accountId, rewardAccount, items } = payload;
      state.accountDelegationsHistory ??= {};
      state.accountDelegationsHistory[accountId] ??= {};
      state.accountDelegationsHistory[accountId][rewardAccount] ??= [];

      state.accountDelegationsHistory[accountId][rewardAccount].push(...items);
    },
    setAccountTransactionHistory: (
      state,
      {
        payload: { accountId, addressHistories },
      }: Readonly<
        PayloadAction<{
          accountId: AccountId;
          addressHistories: {
            address: CardanoPaymentAddress;
            transactionHistory: CardanoTransactionHistoryItem[];
            hasLoadedOldestEntry: boolean;
          }[];
        }>
      >,
    ) => {
      const account = state.accountTransactionHistory[accountId] ?? {};
      for (const {
        address,
        transactionHistory,
        hasLoadedOldestEntry,
      } of addressHistories) {
        account[address] = {
          hasLoadedOldestEntry,
          transactionHistory,
        };
      }
      state.accountTransactionHistory[accountId] = account;
    },
    clearAccountTransactionHistory: (
      state,
      {
        payload: { accountId },
      }: Readonly<PayloadAction<{ accountId: AccountId }>>,
    ) => {
      delete state.accountTransactionHistory[accountId];
    },
    clearAllTransactionHistories: state => {
      state.accountTransactionHistory = {};
    },
    setAccountUtxos: {
      reducer: (
        state,
        {
          payload,
        }: Readonly<
          PayloadAction<{
            accountId: AccountId;
            utxos: Serializable<Cardano.Utxo[]>;
          }>
        >,
      ) => {
        state.accountUtxos[payload.accountId] = payload.utxos;
      },
      prepare: ({
        accountId,
        utxos,
      }: {
        accountId: AccountId;
        utxos: Cardano.Utxo[];
      }) => ({
        payload: {
          accountId,
          utxos: Serializable.to(utxos),
        },
      }),
    },
    /**
     * Sets unspendable UTXOs for an account.
     */
    setAccountUnspendableUtxos: {
      reducer: (
        state,
        {
          payload,
        }: Readonly<
          PayloadAction<{
            accountId: AccountId;
            utxos: Serializable<Cardano.Utxo[]>;
          }>
        >,
      ) => {
        state.accountUnspendableUtxos[payload.accountId] = payload.utxos;
      },
      prepare: ({
        accountId,
        utxos,
      }: {
        accountId: AccountId;
        utxos: Cardano.Utxo[];
      }) => {
        const serialized = Serializable.to<Cardano.Utxo[]>(utxos);
        return { payload: { accountId, utxos: serialized } };
      },
    },
    /**
     * Sets the reward account details for the first stake key of an account.
     */
    setRewardAccountDetails: {
      reducer: (
        state,
        {
          payload,
        }: Readonly<
          PayloadAction<{
            accountId: AccountId;
            details: Serializable<RewardAccountDetails>;
          }>
        >,
      ) => {
        state.rewardAccountDetails[payload.accountId] = payload.details;
      },
      prepare: ({
        accountId,
        details,
      }: {
        accountId: AccountId;
        details: RewardAccountDetails;
      }) => ({
        payload: {
          accountId,
          details: Serializable.to(details),
        },
      }),
    },
    setDelegationActivities: (
      state,
      {
        payload: { accountId, rewardAccount, activities: incomingActivities },
      }: Readonly<
        PayloadAction<{
          accountId: AccountId;
          rewardAccount: CardanoRewardAccount;
          activities: Activity[];
        }>
      >,
    ) => {
      // Initialize delegationActivities if it doesn't exist
      state.delegationActivities ??= {};
      state.delegationActivities[accountId] ??= {};
      state.delegationActivities[accountId][rewardAccount] ??= [];

      const currentActivities =
        state.delegationActivities[accountId][rewardAccount] || [];
      // Merge activities and deduplicate by activityId
      const jointActivityEntries = [
        ...currentActivities,
        ...incomingActivities,
      ].map(
        activity =>
          [`${activity.activityId}-${activity.type}`, activity] as const,
      );
      // Sort by timestamp descending (newest first)
      state.delegationActivities[accountId][rewardAccount] = [
        ...new Map(jointActivityEntries).values(),
      ].sort((a, b) => b.timestamp - a.timestamp);
    },
    clearAccountDelegationHistory: (
      state,
      {
        payload: { accountId, rewardAccount },
      }: Readonly<
        PayloadAction<{
          accountId: AccountId;
          rewardAccount: CardanoRewardAccount;
        }>
      >,
    ) => {
      // Clear account delegations history
      if (state.accountDelegationsHistory[accountId]) {
        delete state.accountDelegationsHistory[accountId][rewardAccount];
        // Clean up empty account entry
        if (
          Object.keys(state.accountDelegationsHistory[accountId]).length === 0
        ) {
          delete state.accountDelegationsHistory[accountId];
        }
      }

      // Clear delegation activities
      if (state.delegationActivities[accountId]) {
        delete state.delegationActivities[accountId][rewardAccount];
        // Clean up empty account entry
        if (Object.keys(state.delegationActivities[accountId]).length === 0) {
          delete state.delegationActivities[accountId];
        }
      }

      // Clear delegation errors
      if (state.delegationErrors[accountId]) {
        delete state.delegationErrors[accountId][rewardAccount];
        // Clean up empty account entry
        if (Object.keys(state.delegationErrors[accountId]).length === 0) {
          delete state.delegationErrors[accountId];
        }
      }
    },
    setAccountDelegationsHistoryFailed: (
      state,
      {
        payload: { accountId, rewardAccount, failure },
      }: Readonly<
        PayloadAction<{
          accountId: AccountId;
          rewardAccount: CardanoRewardAccount;
          failure: ProviderFailure;
        }>
      >,
    ) => {
      state.delegationErrors ??= {};
      state.delegationErrors[accountId] ??= {};
      state.delegationErrors[accountId][rewardAccount] = failure;
    },
    setDelegationActivitiesFailed: (
      state,
      {
        payload: { accountId, rewardAccount, failure },
      }: Readonly<
        PayloadAction<{
          accountId: AccountId;
          rewardAccount: CardanoRewardAccount;
          failure: ProviderFailure;
        }>
      >,
    ) => {
      state.delegationErrors ??= {};
      state.delegationErrors[accountId] ??= {};
      state.delegationErrors[accountId][rewardAccount] = failure;
    },
    /**
     * Trigger action to retry sync round for failed accounts.
     * This action does not modify state - it's handled by side effects.
     * Side effects will query the failures store to find failed accounts
     * and retry sync only for those accounts.
     */
    retrySyncRound: () => {
      // Trigger action only - no state changes
    },
  },
  extraReducers: builder => {
    /**
     * Handles the removeAccount action to remove the cardano context data for the account.
     * @param state - The current state of the cardano context slice.
     * @param action - The removeAccount action containing the payload with accountId.
     */
    builder.addCase(walletsActions.wallets.removeAccount, (state, action) => {
      const { accountId } = action.payload;
      delete state.accountTransactionHistory[accountId];
      delete state.accountRewardsHistory[accountId];
      delete state.accountTransactionsTotal[accountId];
      delete state.accountUtxos[accountId];
      delete state.rewardAccountDetails[accountId];
      delete state.accountDelegationsHistory[accountId];
      delete state.delegationActivities[accountId];
      delete state.delegationErrors[accountId];
      delete state.accountUnspendableUtxos[accountId];
    });

    /**
     * Handles the removeWallet action to remove cardano context data for all accounts of the wallet.
     * @param state - The current state of the cardano context slice.
     * @param action - The removeWallet action containing the walletId and accountIds.
     */
    builder.addCase(walletsActions.wallets.removeWallet, (state, action) => {
      const { accountIds } = action.payload;
      for (const accountId of accountIds) {
        delete state.accountTransactionHistory[accountId];
        delete state.accountRewardsHistory[accountId];
        delete state.accountTransactionsTotal[accountId];
        delete state.accountUtxos[accountId];
        delete state.rewardAccountDetails[accountId];
        delete state.accountDelegationsHistory[accountId];
        delete state.delegationActivities[accountId];
        delete state.delegationErrors[accountId];
        delete state.accountUnspendableUtxos[accountId];
      }
    });
  },
  selectors: {
    selectAccountTransactionHistory: (state: CardanoContextSliceState) => {
      return state.accountTransactionHistory;
    },
    selectTransactionHistoryGroupedByAccount: createSelector(
      (state: CardanoContextSliceState) => state.accountTransactionHistory,
      accountHistoryMap => {
        const knownAccountTxHistoryMap: CardanoAccountTransactionsHistoryMap =
          {};

        Object.entries(accountHistoryMap).forEach(
          ([accountId, addressHistoryMap]) => {
            // Flatten txs from all account addresses
            const addressHistories = Object.values(addressHistoryMap);
            const knownAccountTransactionHistory = flatMap(
              addressHistories,
              ({ transactionHistory }) => transactionHistory,
            );

            // Check if all addresses have loaded their oldest entry, which would mean
            // that the account history is fully loaded and we know its full length
            const isCompletelyLoaded = addressHistories.every(
              ({ hasLoadedOldestEntry }) => hasLoadedOldestEntry,
            );
            // Until all addresses are completely loaded, take the longest address history
            // length as a reference for "known account history"
            const longestHistory = Math.max(
              0,
              ...addressHistories.map(
                ({ transactionHistory }) => transactionHistory.length,
              ),
            );
            // Sort all txs by blockTime and limit them by known history length
            knownAccountTxHistoryMap[AccountId(accountId)] =
              // de-duplicate txs potentially present on multiple account addresses
              uniqBy(knownAccountTransactionHistory, 'txId')
                .sort(
                  (a, b) =>
                    Number(b.blockTime) - Number(a.blockTime) ||
                    Number(b.txIndex) - Number(a.txIndex),
                )
                .slice(0, isCompletelyLoaded ? undefined : longestHistory);
          },
        );

        return knownAccountTxHistoryMap;
      },
    ),
    selectRewardsHistoryGroupedByAccount: createSelector(
      (state: CardanoContextSliceState) => state.accountRewardsHistory,
      rawRewardsHistory => {
        const accountRewardsHistory: CardanoAccountToRewardsMap = {};

        Object.entries(rawRewardsHistory).forEach(([accountId, rewards]) => {
          Object.values(rewards).forEach(reward => {
            const account = accountRewardsHistory[AccountId(accountId)] ?? [];
            account.push(...reward);
            accountRewardsHistory[AccountId(accountId)] = account;
          });
        });

        // Sort rewards by epoch in descending order
        Object.keys(accountRewardsHistory).forEach(accountId => {
          accountRewardsHistory[AccountId(accountId)].sort(
            (a, b) => Number(b.epoch) - Number(a.epoch),
          );
        });

        return accountRewardsHistory;
      },
    ),
    selectAllNetworkInfo: state => state.networkInfo,
    selectAccountUtxosRaw: ({ accountUtxos }) => accountUtxos,
    selectAccountUnspendableUtxosRaw: ({ accountUnspendableUtxos }) =>
      accountUnspendableUtxos,
    selectAccountTransactionsTotal: ({ accountTransactionsTotal }) =>
      accountTransactionsTotal ?? EMPTY_ACCOUNT_TRANSACTIONS_TOTAL,
    selectRewardAccountDetailsRaw: ({ rewardAccountDetails }) =>
      rewardAccountDetails,
    selectAccountDelegationsHistory: (state: CardanoContextSliceState) =>
      state.accountDelegationsHistory,
    selectAccountRewardsHistory: (state: CardanoContextSliceState) =>
      state.accountRewardsHistory,
    selectDelegationActivities: (state: CardanoContextSliceState) =>
      state.delegationActivities ?? EMPTY_DELEGATION_ACTIVITIES,
    selectDelegationErrors: (state: CardanoContextSliceState) =>
      state.delegationErrors ?? EMPTY_DELEGATION_ERRORS,
  },
});

const selectBlockchainNetworkId = createSelector(
  networkSelectors.network.selectNetworkType,
  networkSelectors.network.selectBlockchainNetworks,
  (networkType, blockchainNetworks) =>
    blockchainNetworks.Cardano?.[networkType] as CardanoNetworkId | undefined,
);

const selectChainId = createSelector(
  selectBlockchainNetworkId,
  (networkId): Cardano.ChainId | undefined =>
    networkId ? CardanoNetworkId.getChainId(networkId) : undefined,
);

const selectActiveNetworkInfo = createSelector(
  slice.selectors.selectAllNetworkInfo,
  selectBlockchainNetworkId,
  (allNetworkInfo, activeNetworkId) =>
    activeNetworkId && allNetworkInfo[activeNetworkId],
);

const selectTip = createSelector(
  selectActiveNetworkInfo,
  networkInfo => networkInfo?.tip,
);

const selectProtocolParameters = createSelector(
  selectActiveNetworkInfo,
  networkInfo => networkInfo?.protocolParameters,
);

const selectEraSummaries = createSelector(
  selectActiveNetworkInfo,
  networkInfo =>
    networkInfo?.eraSummaries
      ? Serializable.fromCached(networkInfo.eraSummaries)
      : undefined,
);
const selectDelegationActivitiesParams = createSelector(
  slice.selectors.selectAccountDelegationsHistory,
  slice.selectors.selectDelegationActivities,
  slice.selectors.selectAccountRewardsHistory,
  (accountDelegationsHistory, delegationActivities, accountRewardsHistory) => ({
    accountDelegationsHistory,
    delegationActivities,
    accountRewardsHistory,
  }),
);

const selectDelegationActivities = createSelector(
  selectDelegationActivitiesParams,
  selectEraSummaries,
  (
    _: unknown,
    params: {
      accountId: AccountId;
      rewardAccount: CardanoRewardAccount;
    },
  ) => params,
  (
    { accountDelegationsHistory, delegationActivities, accountRewardsHistory },
    eraSummaries,
    { accountId, rewardAccount },
  ) => {
    const historyEntry =
      accountDelegationsHistory[accountId]?.[rewardAccount] ?? [];
    const accountActivities =
      delegationActivities[accountId]?.[rewardAccount] ?? [];

    const isLoadingActivities =
      historyEntry.length !== accountActivities.length;

    // Merge rewards with activities similar to selectCombinedTransactionHistory
    let mergedActivities: Activity[] = [];
    if (eraSummaries && !isLoadingActivities) {
      const rewards = accountRewardsHistory[accountId]?.[rewardAccount] ?? [];

      // Filter rewards that are after the last activity (if any), similar to selectCombinedTransactionHistory
      const rewardsTillLastActivity =
        accountActivities.length > 0
          ? rewards.filter(
              reward =>
                getRewardSpendableDate(reward.epoch, eraSummaries).getTime() >
                accountActivities.at(-1)!.timestamp,
            )
          : rewards;

      const rewardActivities = rewardsTillLastActivity.map(reward =>
        mapRewardToActivity({
          reward,
          eraSummaries,
          rewardAccount,
          accountId,
        }),
      );

      mergedActivities = [...accountActivities, ...rewardActivities];

      // Sort by timestamp descending (newest first)
      mergedActivities.sort((a, b) => b.timestamp - a.timestamp);
    }

    return {
      activities: mergedActivities,
      isLoadingActivities,
    };
  },
);

const selectDelegationError = createSelector(
  slice.selectors.selectDelegationErrors,
  (
    _: unknown,
    params: {
      accountId: AccountId;
      rewardAccount: CardanoRewardAccount;
    },
  ) => params,
  (delegationErrors, { accountId, rewardAccount }) => {
    return delegationErrors[accountId]?.[rewardAccount];
  },
);

/**
 * Per-account selector that flattens and sorts rewards only for the requested account.
 * Avoids the cost of processing ALL accounts when only one is needed (e.g., in the
 * StakeDelegation sheet). The full-map variant `selectRewardsHistoryGroupedByAccount`
 * remains for consumers that need all accounts (side effects, combined history).
 */
/**
 * Parameterized input selector that extracts the per-account rewards sub-map.
 * Keyed on the account's own sub-map reference (preserved by Immer across
 * unrelated account updates), so downstream selectors only invalidate when
 * THIS account's rewards actually change.
 */
const selectRewardsForAccountRaw = markParameterizedSelector(
  createSelector(
    slice.selectors.selectAccountRewardsHistory,
    (_: unknown, accountId: AccountId) => accountId,
    (rewardsHistory, accountId) => rewardsHistory[accountId],
  ),
);

const selectRewardsHistoryForAccount = markParameterizedSelector(
  createSelector(selectRewardsForAccountRaw, (rewardAccountMap): Reward[] => {
    if (!rewardAccountMap) return EMPTY_REWARDS;

    const rewards: Reward[] = [];
    for (const rewardAccount in rewardAccountMap) {
      const rewardList =
        rewardAccountMap[rewardAccount as CardanoRewardAccount];
      if (rewardList) {
        for (const reward of rewardList) {
          rewards.push(reward);
        }
      }
    }

    if (rewards.length === 0) return EMPTY_REWARDS;

    rewards.sort((a, b) => Number(b.epoch) - Number(a.epoch));
    return rewards;
  }),
);

const selectAccountUtxos = createSelector(
  slice.selectors.selectAccountUtxosRaw,
  (accountUtxosRaw): AccountUtxoMap => {
    const result: AccountUtxoMap = {};
    for (const accountId in accountUtxosRaw) {
      const serialized = accountUtxosRaw[accountId as AccountId];
      if (serialized) {
        result[accountId as AccountId] =
          Serializable.fromCached<Cardano.Utxo[]>(serialized) ?? [];
      }
    }
    return result;
  },
);

const selectAccountUnspendableUtxos = createSelector(
  slice.selectors.selectAccountUnspendableUtxosRaw,
  (accountUnspendableUtxosRaw): AccountUnspendableUtxoMap => {
    const result: AccountUnspendableUtxoMap = {};
    for (const accountId in accountUnspendableUtxosRaw) {
      const serialized = accountUnspendableUtxosRaw[accountId as AccountId];
      if (serialized) {
        result[accountId as AccountId] =
          Serializable.fromCached<Cardano.Utxo[]>(serialized) ?? [];
      }
    }
    return result;
  },
);

const selectRewardAccountDetails = createSelector(
  slice.selectors.selectRewardAccountDetailsRaw,
  (rewardAccountDetailsRaw): AccountRewardAccountDetailsMap => {
    const result: AccountRewardAccountDetailsMap = {};
    for (const accountId in rewardAccountDetailsRaw) {
      const serialized = rewardAccountDetailsRaw[accountId as AccountId];
      if (serialized) {
        const details =
          Serializable.fromCached<RewardAccountDetails>(serialized);
        if (details) {
          result[accountId as AccountId] = details;
        }
      }
    }
    return result;
  },
);

/**
 * Selector that returns account UTXOs with unspendable UTXOs filtered out.
 * Filters out any UTXOs that match the account's unspendable UTXO list.
 */
const selectAvailableAccountUtxos = createSelector(
  selectAccountUtxos,
  selectAccountUnspendableUtxos,
  (accountUtxos, accountUnspendableUtxos): AccountUtxoMap => {
    const filtered: AccountUtxoMap = {};

    for (const [accountId, utxos] of Object.entries(accountUtxos)) {
      filtered[AccountId(accountId)] = filterSpendableUtxos(
        utxos,
        accountUnspendableUtxos[AccountId(accountId)] ?? [],
      );
    }

    return filtered;
  },
);

/**
 * Selector that gets the eligible collateral UTXO for a specific account
 * from its available (non-unspendable) UTXOs.
 * Uses selectAvailableAccountUtxos to get filtered UTXOs and returns
 * the first eligible collateral UTXO found.
 *
 * @param accountId - The account ID to get eligible collateral UTXO for
 * @returns The first eligible collateral UTXO found, or `undefined` if none found
 */
const selectAvailableAccountUtxosWithEligibleCollateral = createSelector(
  selectAvailableAccountUtxos,
  (_: unknown, accountId: AccountId) => accountId,
  (availableAccountUtxos, accountId): Cardano.Utxo | undefined => {
    const utxos = availableAccountUtxos[accountId] ?? [];
    return getEligibleCollateralUtxo(utxos);
  },
);

const selectCombinedTransactionHistory = createSelector(
  slice.selectors.selectTransactionHistoryGroupedByAccount,
  slice.selectors.selectRewardsHistoryGroupedByAccount,
  selectEraSummaries,
  (
    transactionHistory,
    rewardsHistory,
    eraSummaries,
  ): Record<AccountId, (CardanoTransactionHistoryItem | Reward)[]> => {
    if (!eraSummaries) return {};
    const combinedHistoryMap: Record<
      AccountId,
      (CardanoTransactionHistoryItem | Reward)[]
    > = {};
    Object.entries(transactionHistory).forEach(([accountId, history]) => {
      const rewardsTillLastHistoryItem = (
        rewardsHistory[AccountId(accountId)] ?? []
      ).filter(
        reward =>
          getRewardSpendableDate(reward.epoch, eraSummaries).getTime() >
          history[history.length - 1].blockTime,
      );
      combinedHistoryMap[AccountId(accountId)] = [
        ...history,
        ...rewardsTillLastHistoryItem,
      ].sort(
        (a, b) =>
          getHistoryItemTimestamp(b, eraSummaries) -
          getHistoryItemTimestamp(a, eraSummaries),
      );
    });
    return combinedHistoryMap;
  },
);

const selectStakingStatus = createSelector(
  selectRewardAccountDetails,
  tokensSelectors.tokens.selectVisibleAccountIds,
  selectHasEverSynced,
  (
    rewardAccountDetails,
    visibleAccountIds,
    hasEverSynced,
  ): {
    totalRewardsSum: BigNumber;
    totalStakedAmount: BigNumber;
    totalUnstakedAmount: BigNumber;
    stakingStatus: 'loading' | 'staked' | 'unstaked';
  } => {
    const loadingState = {
      totalRewardsSum: new BigNumber(0),
      totalStakedAmount: new BigNumber(0),
      totalUnstakedAmount: new BigNumber(0),
      stakingStatus: 'loading' as const,
    };

    const visibleAccountIdsSet = new Set(visibleAccountIds);
    const accountEntries = Object.entries(rewardAccountDetails);

    if (visibleAccountIds.length === 0) {
      return loadingState;
    }

    // No reward account details loaded for any account.
    // If sync has never completed, data is still being fetched → loading.
    // If sync has completed but no reward details exist, this is an empty
    // wallet with no on-chain activity → show staked view with all zeros.
    if (accountEntries.length === 0) {
      if (!hasEverSynced) {
        return loadingState;
      }
      return {
        totalRewardsSum: new BigNumber(0),
        totalStakedAmount: new BigNumber(0),
        totalUnstakedAmount: new BigNumber(0),
        stakingStatus: 'staked' as const,
      };
    }

    let totalRewardsSum = new BigNumber(0);
    let totalStakedAmount = new BigNumber(0);
    let totalUnstakedAmount = new BigNumber(0);
    let hasAnyActiveAccount = false;
    let hasAnyMatchingAccount = false;

    for (const [accountId, details] of accountEntries) {
      // Filter out accounts that are not visible (not on the current network)
      if (!visibleAccountIdsSet.has(AccountId(accountId))) {
        continue;
      }

      hasAnyMatchingAccount = true;
      const { rewardsSum, isActive, controlledAmount } =
        details.rewardAccountInfo;
      totalRewardsSum = totalRewardsSum.plus(rewardsSum);
      if (isActive) {
        hasAnyActiveAccount = true;
        totalStakedAmount = totalStakedAmount.plus(controlledAmount);
      } else {
        totalUnstakedAmount = totalUnstakedAmount.plus(controlledAmount);
      }
    }

    // If no accounts matched the current network, return loading state
    if (!hasAnyMatchingAccount) {
      return loadingState;
    }

    const stakingStatus =
      hasAnyActiveAccount || totalRewardsSum.gt(0) ? 'staked' : 'unstaked';

    return {
      totalRewardsSum,
      totalStakedAmount,
      totalUnstakedAmount,
      stakingStatus,
    };
  },
);

const selectActiveCardanoAccounts = createSelector(
  walletsSelectors.wallets.selectActiveNetworkAccounts,
  selectBlockchainNetworkId,
  (allAccounts, blockchainNetworkId) =>
    allAccounts.filter(
      (
        account,
      ): account is AnyAccount<
        CardanoBip32AccountProps,
        CardanoBip32AccountProps,
        CardanoMultiSigAccountProps
      > => account.blockchainNetworkId === blockchainNetworkId,
    ),
);

export const cardanoContextReducers = {
  [slice.name]: slice.reducer,
  ...collateralFlowReducers,
};

/** Direct import of this is an anti-pattern. OK for tests. */
export const cardanoContextActions = {
  cardanoContext: {
    ...slice.actions,
    loadTokenMetadata: createAction<{ tokenId: TokenId }>(
      'cardanoContext/loadTokenMetadata',
    ),
    loadAccountDelegationHistory: createAction<{
      accountId: AccountId;
      rewardAccount: CardanoRewardAccount;
    }>('cardanoContext/loadAccountDelegationHistory'),
    getTipFailed: createAction<{
      chainId: Cardano.ChainId;
      failure: ProviderFailure;
    }>('cardanoContext/getTipFailed'),
    getTokensFailed: createAction<{
      accountId: AccountId;
      failure: ProviderFailure;
    }>('cardanoContext/getTokensFailed'),
    getTokenMetadataFailed: createAction<{
      tokenId: TokenId;
      failure: ProviderFailure;
    }>('cardanoContext/getTokenMetadataFailed'),
    getProtocolParametersFailed: createAction<{
      chainId: Cardano.ChainId;
      failure: ProviderFailure;
    }>('cardanoContext/getProtocolParametersFailed'),
    getAddressTransactionHistoryFailed: createAction<{
      accountId: AccountId;
      address: CardanoPaymentAddress;
      failure: ProviderFailure;
    }>('cardanoContext/getAddressTransactionHistoryFailed'),
    getAccountRewardsHistoryFailed: createAction<{
      accountId: AccountId;
      failure: ProviderFailure;
    }>('cardanoContext/getAccountRewardsHistoryFailed'),
    setAccountDelegationsHistoryFailed: createAction<{
      accountId: AccountId;
      rewardAccount: CardanoRewardAccount;
      failure: ProviderFailure;
    }>('cardanoContext/setAccountDelegationsHistoryFailed'),
    getEraSummariesFailed: createAction<{
      chainId: Cardano.ChainId;
      failure: ProviderFailure;
    }>('cardanoContext/getEraSummariesFailed'),
    getAccountUtxosFailed: createAction<{
      accountId: AccountId;
      chainId: Cardano.ChainId;
      failure: ProviderFailure;
    }>('cardanoContext/getAccountUtxosFailed'),
    getAccountTransactionsTotalFailed: createAction<{
      accountId: AccountId;
      chainId: Cardano.ChainId;
      failure: ProviderFailure;
    }>('cardanoContext/getAccountTransactionsTotalFailed'),
    getRewardAccountDetailsFailed: createAction<{
      accountId: AccountId;
      rewardAccount: CardanoRewardAccount;
      chainId: Cardano.ChainId;
      failure: ProviderFailure;
    }>('cardanoContext/getRewardAccountDetailsFailed'),
    setDelegationActivitiesFailed: createAction<{
      accountId: AccountId;
      rewardAccount: CardanoRewardAccount;
      failure: ProviderFailure;
    }>('cardanoContext/setDelegationActivitiesFailed'),
    submitTx: createAction<{ serializedTx: HexBytes }>(
      'cardanoContext/submitTx',
    ),
    submitTxCompleted: createAction<{ txId: CardanoTxId }>(
      'cardanoContext/submitTxCompleted',
    ),
    submitTxFailed: createAction<{
      txId: CardanoTxId;
      error: string;
    }>('cardanoContext/submitTxFailed'),
  },
  ...collateralFlowActions,
};

/** Direct import of this is an anti-pattern. OK for tests. */
export const cardanoContextSelectors = {
  cardanoContext: {
    ...slice.selectors,
    selectActiveCardanoAccounts,
    selectTip,
    selectProtocolParameters,
    selectEraSummaries,
    selectAccountUtxos,
    selectAccountUnspendableUtxos,
    selectRewardAccountDetails,
    selectAvailableAccountUtxos,
    selectAvailableAccountUtxosWithEligibleCollateral,
    selectCombinedTransactionHistory,
    selectStakingStatus,
    selectBlockchainNetworkId,
    selectChainId,
    selectDelegationActivities,
    selectDelegationError,
    selectRewardsHistoryForAccount,
  },
  ...collateralFlowSelectors,
};

export type CardanoContextStoreState = StateFromReducersMapObject<
  typeof cardanoContextReducers
>;
