import { activitiesSelectors } from '@lace-contract/activities';
import { addressesSelectors } from '@lace-contract/addresses';
import { markParameterizedSelector } from '@lace-contract/module';
import { networkSelectors } from '@lace-contract/network';
import { selectHasEverSynced, syncSelectors } from '@lace-contract/sync';
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

import { applyInFlightUtxoAdjustments } from '../apply-in-flight-utxo-adjustments';
import { EXPLOIT_DESCRIPTORS } from '../security/exploit-descriptors';
import { filterSpendableUtxos, getEligibleCollateralUtxo } from '../util';
import { CardanoNetworkId } from '../value-objects';

import {
  collateralFlowReducers,
  collateralFlowActions,
  collateralFlowSelectors,
} from './collateral-flow/slice';
import { getRewardSpendableDate, mapRewardToActivity } from './helpers';
import {
  isAddressDiscoveryOperation,
  isThoroughAddressDiscoveryOperation,
} from './side-effects/sync-operation-utils';

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
import type {
  CardanoTxId,
  RewardAccountDetailsCacheKey,
  UtxoCacheKey,
} from '../value-objects';
import type { Cardano, EraSummary } from '@cardano-sdk/core';
import type {
  Activity,
  BlockchainSpecificActivityMetadata,
} from '@lace-contract/activities';
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

/**
 * UTxOs fetched for an account together with the cache key under which the
 * fetch is considered settled. `cacheKey` is set independently from `utxos`:
 * see `setAccountUtxos` (writes `utxos` only) and
 * `setLastFetchedUtxoCacheKey` (advances the gate). The gap lets the natural
 * trigger keep polling while indexer lag could still be hiding UTxOs from a
 * just-confirmed tx.
 */
export type AccountUtxoEntry = {
  utxos: Serializable<Cardano.Utxo[]>;
  cacheKey?: UtxoCacheKey;
};

export type CardanoContextSliceState = {
  accountTransactionHistory: CardanoAccountAddressHistoryMap;
  accountRewardsHistory: CardanoAccountToRewardAccountsMap;
  accountDelegationsHistory: CardanoAccountToDelegationAccountsMap;
  networkInfo: Partial<Record<CardanoNetworkId, CardanoNetworkInfo>>;
  accountUtxos: Partial<Record<AccountId, AccountUtxoEntry>>;
  accountUnspendableUtxos: Partial<
    Record<AccountId, Serializable<Cardano.Utxo[]>>
  >;
  rewardAccountDetails: Partial<
    Record<AccountId, Serializable<RewardAccountDetails>>
  >;
  /**
   * Cache key per account identifying the on-chain state under which the
   * stored `rewardAccountDetails[accountId]` is considered settled. Advanced
   * by `setLastFetchedRewardAccountDetailsCacheKey` independently from the
   * details write, so the natural trigger can keep re-fetching while
   * indexer lag could still hide a just-confirmed cert's effect.
   */
  lastFetchedRewardAccountDetailsCacheKey: Partial<
    Record<AccountId, RewardAccountDetailsCacheKey>
  >;
  delegationActivities: Record<
    AccountId,
    Record<CardanoRewardAccount, Activity[]>
  >;
  /**
   * Result of the opt-in proactive security re-scan per account (persisted).
   * `scannedAt` is the epoch-ms timestamp of the last completed scan;
   * `exploits` holds the ids of compromises found on-chain. A present entry
   * (even with an empty `exploits`) marks the account as already scanned, so
   * the proactive prompt is not shown again.
   */
  securityScanByAccount: Record<
    AccountId,
    { scannedAt: number; exploits: string[] }
  >;
  /**
   * Accounts with an in-flight security re-scan (transient; not persisted).
   */
  securityScanInProgress: Record<AccountId, boolean>;
  /**
   * Accounts whose proactive re-scan banner the user dismissed (persisted).
   * Suppresses both the "Check" prompt and the clean-result note. Does not
   * affect the compromise banner, which is never dismissible.
   */
  securityRescanDismissedByAccount: Record<AccountId, boolean>;
};

export const initialState: CardanoContextSliceState = {
  accountTransactionHistory: {},
  accountRewardsHistory: {},
  networkInfo: {},
  accountUtxos: {},
  accountUnspendableUtxos: {},
  rewardAccountDetails: {},
  lastFetchedRewardAccountDetailsCacheKey: {},
  accountDelegationsHistory: {},
  delegationActivities: {},
  securityScanByAccount: {},
  securityScanInProgress: {},
  securityRescanDismissedByAccount: {},
};

/** Stable fallbacks for slice selectors used as Reselect inputs (dev stability checks). */
const EMPTY_DELEGATION_ACTIVITIES =
  {} as CardanoContextSliceState['delegationActivities'];
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
        const existing = state.accountUtxos[payload.accountId];
        state.accountUtxos[payload.accountId] = {
          utxos: payload.utxos,
          cacheKey: existing?.cacheKey,
        };
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
    setLastFetchedUtxoCacheKey: (
      state,
      {
        payload: { accountId, cacheKey },
      }: Readonly<
        PayloadAction<{ accountId: AccountId; cacheKey: UtxoCacheKey }>
      >,
    ) => {
      const existing = state.accountUtxos[accountId];
      state.accountUtxos[accountId] = {
        utxos: existing?.utxos ?? Serializable.to<Cardano.Utxo[]>([]),
        cacheKey,
      };
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
    setLastFetchedRewardAccountDetailsCacheKey: (
      state,
      {
        payload: { accountId, cacheKey },
      }: Readonly<
        PayloadAction<{
          accountId: AccountId;
          cacheKey: RewardAccountDetailsCacheKey;
        }>
      >,
    ) => {
      state.lastFetchedRewardAccountDetailsCacheKey[accountId] = cacheKey;
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
    /**
     * Trigger action to enqueue a thorough HD address discovery for the
     * given Cardano account. Observed by the `manualAddressDiscoveryEnqueue`
     * side-effect, which builds an ADDRESS_DISCOVERY_THOROUGH operation id
     * and dispatches `actions.sync.addSyncOperation`.
     */
    requestManualAddressDiscovery: (
      _state,
      _action: PayloadAction<{ accountId: AccountId }>,
    ) => {
      // Trigger action only - no state changes
    },
    /**
     * Trigger action requesting an opt-in proactive security re-scan of the
     * account's on-chain tx history. Observed by the `securityRescan`
     * side-effect; does not mutate state directly.
     */
    requestSecurityRescan: (
      _state,
      _action: Readonly<PayloadAction<{ accountId: AccountId }>>,
    ) => {
      // Trigger action only - no state changes
    },
    setSecurityScanInProgress: (
      state,
      {
        payload: { accountId },
      }: Readonly<PayloadAction<{ accountId: AccountId }>>,
    ) => {
      state.securityScanInProgress[accountId] = true;
    },
    setSecurityScanResult: (
      state,
      {
        payload: { accountId, scannedAt, exploits },
      }: Readonly<
        PayloadAction<{
          accountId: AccountId;
          scannedAt: number;
          exploits: string[];
        }>
      >,
    ) => {
      state.securityScanByAccount[accountId] = { scannedAt, exploits };
      delete state.securityScanInProgress[accountId];
    },
    dismissSecurityRescan: (
      state,
      {
        payload: { accountId },
      }: Readonly<PayloadAction<{ accountId: AccountId }>>,
    ) => {
      state.securityRescanDismissedByAccount[accountId] = true;
    },
    setSecurityScanFailed: (
      state,
      {
        payload: { accountId },
      }: Readonly<PayloadAction<{ accountId: AccountId }>>,
    ) => {
      delete state.securityScanInProgress[accountId];
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
      delete state.accountUtxos[accountId];
      delete state.rewardAccountDetails[accountId];
      delete state.lastFetchedRewardAccountDetailsCacheKey[accountId];
      delete state.accountDelegationsHistory[accountId];
      delete state.delegationActivities[accountId];
      delete state.accountUnspendableUtxos[accountId];
      delete state.securityScanByAccount[accountId];
      delete state.securityScanInProgress[accountId];
      delete state.securityRescanDismissedByAccount[accountId];
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
        delete state.accountUtxos[accountId];
        delete state.rewardAccountDetails[accountId];
        delete state.lastFetchedRewardAccountDetailsCacheKey[accountId];
        delete state.accountDelegationsHistory[accountId];
        delete state.delegationActivities[accountId];
        delete state.accountUnspendableUtxos[accountId];
        delete state.securityScanByAccount[accountId];
        delete state.securityScanInProgress[accountId];
        delete state.securityRescanDismissedByAccount[accountId];
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
    selectRewardAccountDetailsRaw: ({ rewardAccountDetails }) =>
      rewardAccountDetails,
    selectLastFetchedRewardAccountDetailsCacheKeyByAccount: ({
      lastFetchedRewardAccountDetailsCacheKey,
    }) => lastFetchedRewardAccountDetailsCacheKey,
    selectAccountDelegationsHistory: (state: CardanoContextSliceState) =>
      state.accountDelegationsHistory,
    selectAccountRewardsHistory: (state: CardanoContextSliceState) =>
      state.accountRewardsHistory,
    selectDelegationActivities: (state: CardanoContextSliceState) =>
      state.delegationActivities ?? EMPTY_DELEGATION_ACTIVITIES,
    selectSecurityScanByAccount: (state: CardanoContextSliceState) =>
      state.securityScanByAccount,
    selectSecurityScanInProgress: (state: CardanoContextSliceState) =>
      state.securityScanInProgress,
    selectSecurityRescanDismissedByAccount: (state: CardanoContextSliceState) =>
      state.securityRescanDismissedByAccount,
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
      const entry = accountUtxosRaw[accountId as AccountId];
      if (entry) {
        result[accountId as AccountId] =
          Serializable.fromCached<Cardano.Utxo[]>(entry.utxos) ?? [];
      }
    }
    return result;
  },
);

const selectLastFetchedUtxoCacheKeyByAccount = createSelector(
  slice.selectors.selectAccountUtxosRaw,
  (accountUtxosRaw): Partial<Record<AccountId, UtxoCacheKey>> => {
    const result: Partial<Record<AccountId, UtxoCacheKey>> = {};
    for (const accountId in accountUtxosRaw) {
      const cacheKey = accountUtxosRaw[accountId as AccountId]?.cacheKey;
      if (cacheKey) {
        result[accountId as AccountId] = cacheKey;
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

const { selectPendingActivitiesByAccount } = activitiesSelectors.activities;

const EMPTY_CARDANO_ADDRESSES: CardanoPaymentAddress[] = [];

const selectCardanoAddressesByAccount = createSelector(
  addressesSelectors.addresses.selectAllAddresses,
  (allAddresses): Record<AccountId, CardanoPaymentAddress[]> => {
    const result: Record<AccountId, CardanoPaymentAddress[]> = {};
    for (const entry of allAddresses) {
      if (entry.blockchainName !== 'Cardano') continue;
      const list = result[entry.accountId] ?? (result[entry.accountId] = []);
      list.push(entry.address as unknown as CardanoPaymentAddress);
    }
    return result;
  },
);

/* eslint-disable max-params */
const selectAvailableAccountUtxos = createSelector(
  selectAccountUtxos,
  selectAccountUnspendableUtxos,
  selectPendingActivitiesByAccount,
  selectCardanoAddressesByAccount,
  (
    accountUtxos,
    accountUnspendableUtxos,
    pendingActivitiesByAccount,
    addressesByAccount,
  ): AccountUtxoMap => {
    const result: AccountUtxoMap = {};

    for (const [accountId, utxos] of Object.entries(accountUtxos)) {
      const spendable = filterSpendableUtxos(
        utxos,
        accountUnspendableUtxos[AccountId(accountId)] ?? [],
      );
      result[AccountId(accountId)] = applyInFlightUtxoAdjustments(
        spendable,
        addressesByAccount[AccountId(accountId)] ?? EMPTY_CARDANO_ADDRESSES,
        pendingActivitiesByAccount[AccountId(accountId)] ?? [],
      );
    }

    return result;
  },
);
/* eslint-enable max-params */

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

/**
 * True while a user-triggered (thorough) address discovery for this account
 * is Pending or InProgress. Standard automatic ADDRESS_DISCOVERY is ignored —
 * only the thorough variant drives the manual-sync UI.
 */
const selectIsManualHdSyncInProgress = markParameterizedSelector(
  createSelector(
    syncSelectors.sync.selectSyncStatusByAccount,
    (_state: unknown, accountId: AccountId) => accountId,
    (syncStatusByAccount, accountId) => {
      const pending = syncStatusByAccount[accountId]?.pendingSync;
      if (!pending) return false;
      return Object.values(pending.operations).some(
        op =>
          isThoroughAddressDiscoveryOperation(op.operationId) &&
          (op.status === 'Pending' || op.status === 'InProgress'),
      );
    },
  ),
);

/**
 * True while ANY address discovery (standard or thorough) is Pending or
 * InProgress for this account. Used to gate the manual HD sync CTA so the
 * user can't enqueue a thorough walk while a routine discovery is already
 * running against the same xpub.
 */
const selectIsAddressDiscoveryInProgress = markParameterizedSelector(
  createSelector(
    syncSelectors.sync.selectSyncStatusByAccount,
    (_state: unknown, accountId: AccountId) => accountId,
    (syncStatusByAccount, accountId) => {
      const pending = syncStatusByAccount[accountId]?.pendingSync;
      if (!pending) return false;
      return Object.values(pending.operations).some(
        op =>
          isAddressDiscoveryOperation(op.operationId) &&
          (op.status === 'Pending' || op.status === 'InProgress'),
      );
    },
  ),
);

/**
 * AccountId of any account that currently has a thorough address discovery
 * operation in its `pendingSync` — irrespective of operation status.
 *
 * Returns the accountId while the op is Pending/InProgress (so the overlay
 * mounts) AND for the brief window after the op transitions to
 * Completed/Failed but before the sync round clears `pendingSync` (so the
 * mounted overlay's outcome-detection effect can fire its toast). Returns
 * undefined once the slice clears the op.
 *
 * Intentionally NOT scoped to the active account context: a user can trigger
 * manual HD sync from the settings page of any account (the URL params drive
 * which account the row is bound to), so the overlay must follow whichever
 * account is syncing, not the one currently selected as active.
 */
const selectAccountIdInManualHdSync = createSelector(
  syncSelectors.sync.selectSyncStatusByAccount,
  syncStatusByAccount => {
    for (const accountId in syncStatusByAccount) {
      const pending = syncStatusByAccount[accountId as AccountId]?.pendingSync;
      if (!pending) continue;
      const hasThorough = Object.values(pending.operations).some(op =>
        isThoroughAddressDiscoveryOperation(op.operationId),
      );
      if (hasThorough) return accountId as AccountId;
    }
    return undefined;
  },
);

/**
 * Terminal status of the most recently observed thorough address discovery
 * operation for this account, while it still lives in `pendingSync`.
 * Returns 'Completed' or 'Failed' for a brief window before the sync round
 * clears `pendingSync` entirely. Used by `HdSyncOverlay` to pick a toast.
 */
const selectManualHdSyncTerminalStatus = markParameterizedSelector(
  createSelector(
    syncSelectors.sync.selectSyncStatusByAccount,
    (_state: unknown, accountId: AccountId) => accountId,
    (syncStatusByAccount, accountId) => {
      const pending = syncStatusByAccount[accountId]?.pendingSync;
      if (!pending) return undefined;
      for (const op of Object.values(pending.operations)) {
        if (!isThoroughAddressDiscoveryOperation(op.operationId)) continue;
        if (op.status === 'Completed' || op.status === 'Failed') {
          return op.status;
        }
      }
      return undefined;
    },
  ),
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

const getAccountFlaggedExploits = (
  activitiesByAccount: Record<AccountId, Activity[]>,
  accountId: AccountId,
): string[] => {
  const flagged = new Set<string>();
  for (const activity of activitiesByAccount[accountId] ?? []) {
    const exploits = (
      activity.blockchainSpecific as
        | BlockchainSpecificActivityMetadata
        | undefined
    )?.Cardano?.security?.exploits;
    if (!exploits) continue;
    for (const [exploitId, isFlagged] of Object.entries(exploits)) {
      if (isFlagged === true) flagged.add(exploitId);
    }
  }
  return [...flagged];
};

/** Stable empty fallback for exploit-id lists used as Reselect inputs/outputs. */
const EMPTY_EXPLOITS: string[] = [];

/**
 * Ids of security exploits (e.g. deterministicNonce202606) flagged on an account. Unions
 * the two detection paths: exploits found on mapped activities (the #2360
 * activity-time detector) and exploits recorded by the proactive re-scan.
 */
const selectAccountFlaggedExploits = markParameterizedSelector(
  createSelector(
    activitiesSelectors.activities.selectAllMap,
    slice.selectors.selectSecurityScanByAccount,
    (_state: unknown, accountId: AccountId) => accountId,
    (activitiesByAccount, scanByAccount, accountId) => [
      ...new Set([
        ...getAccountFlaggedExploits(activitiesByAccount, accountId),
        ...(scanByAccount[accountId]?.exploits ?? EMPTY_EXPLOITS),
      ]),
    ],
  ),
);

/** True when the account has any flagged security exploit (either path). */
const selectIsAccountCompromised = markParameterizedSelector(
  createSelector(
    activitiesSelectors.activities.selectAllMap,
    slice.selectors.selectSecurityScanByAccount,
    (_state: unknown, accountId: AccountId) => accountId,
    (activitiesByAccount, scanByAccount, accountId) =>
      new Set([
        ...getAccountFlaggedExploits(activitiesByAccount, accountId),
        ...(scanByAccount[accountId]?.exploits ?? EMPTY_EXPLOITS),
      ]).size > 0,
  ),
);

/**
 * Flagged exploit ids per account, sparse (only accounts with findings). Single
 * non-parameterized read for list contexts that render many account names and
 * cannot call a per-account hook in a loop. Merges activity-time findings with
 * proactive re-scan results.
 */
const selectFlaggedExploitsByAccount = createSelector(
  activitiesSelectors.activities.selectAllMap,
  slice.selectors.selectSecurityScanByAccount,
  (activitiesByAccount, scanByAccount): Record<AccountId, string[]> => {
    const result: Record<AccountId, string[]> = {};
    const accountIds = new Set<AccountId>([
      ...(Object.keys(activitiesByAccount) as AccountId[]),
      ...(Object.keys(scanByAccount) as AccountId[]),
    ]);
    for (const accountId of accountIds) {
      const flagged = [
        ...new Set([
          ...getAccountFlaggedExploits(activitiesByAccount, accountId),
          ...(scanByAccount[accountId]?.exploits ?? EMPTY_EXPLOITS),
        ]),
      ];
      if (flagged.length > 0) result[accountId] = flagged;
    }
    return result;
  },
);

/** Bundles the per-account security scan maps into one memoized input. */
const selectSecurityScanMaps = createSelector(
  slice.selectors.selectSecurityScanByAccount,
  slice.selectors.selectSecurityScanInProgress,
  slice.selectors.selectSecurityRescanDismissedByAccount,
  (scanByAccount, inProgressByAccount, dismissedByAccount) => ({
    scanByAccount,
    inProgressByAccount,
    dismissedByAccount,
  }),
);

/** Whether the account has been scanned, is scanning, or was dismissed. */
const selectSecurityScanState = markParameterizedSelector(
  createSelector(
    selectSecurityScanMaps,
    (_state: unknown, accountId: AccountId) => accountId,
    (maps, accountId) => ({
      scanned: maps.scanByAccount[accountId] !== undefined,
      scanning: maps.inProgressByAccount[accountId] === true,
      dismissed: maps.dismissedByAccount[accountId] === true,
    }),
  ),
);

const selectRescanContext = createSelector(
  selectSecurityScanMaps,
  slice.selectors.selectTransactionHistoryGroupedByAccount,
  syncSelectors.sync.selectSyncStatusByAccount,
  (maps, historyByAccount, syncStatusByAccount) => ({
    maps,
    historyByAccount,
    syncStatusByAccount,
  }),
);

/** Bundles the inputs the proactive re-scan decision depends on. */
const selectRescanInputs = createSelector(
  walletsSelectors.wallets.selectActiveNetworkAccounts,
  selectRescanContext,
  (accounts, context) => ({ accounts, ...context }),
);

/**
 * True when the account should be offered a proactive security re-scan: it has
 * completed a full sync (so its local history is not partial) AND has on-chain
 * transaction history (the exploit only manifests through a signed transaction,
 * so accounts with no history have nothing to scan) AND an exploit applies to
 * its blockchain AND it has not already been dedicated-scanned AND either its
 * onboarding date is unknown (persisted before the field existed -> assume
 * pre-detection) or that exploit's detection shipped after the account was
 * onboarded (so activity-time detection never covered it). Accounts on a
 * blockchain no exploit targets are never offered, and an account the user has
 * dismissed is never offered again.
 */
const selectNeedsSecurityRescan = markParameterizedSelector(
  createSelector(
    selectRescanInputs,
    (_state: unknown, accountId: AccountId) => accountId,
    ({ accounts, maps, historyByAccount, syncStatusByAccount }, accountId) => {
      if (maps.dismissedByAccount[accountId] === true) return false;
      if (maps.scanByAccount[accountId] !== undefined) return false;
      if (syncStatusByAccount[accountId]?.lastSuccessfulSync === undefined) {
        return false;
      }
      const history = historyByAccount[accountId];
      if (history === undefined || history.length === 0) return false;
      const account = accounts.find(a => a.accountId === accountId);
      if (account === undefined) return false;
      const applicable = Object.values(EXPLOIT_DESCRIPTORS).filter(descriptor =>
        descriptor.blockchains.includes(account.blockchainName),
      );
      if (applicable.length === 0) return false;
      const onboardedAt = account.metadata.onboardedAt;
      if (onboardedAt === undefined) return true;
      return applicable.some(
        descriptor => descriptor.detectionAvailableSince > onboardedAt,
      );
    },
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
    selectLastFetchedUtxoCacheKeyByAccount,
    selectRewardAccountDetails,
    selectAvailableAccountUtxos,
    selectAvailableAccountUtxosWithEligibleCollateral,
    selectCombinedTransactionHistory,
    selectStakingStatus,
    selectBlockchainNetworkId,
    selectChainId,
    selectDelegationActivities,
    selectRewardsHistoryForAccount,
    selectIsManualHdSyncInProgress,
    selectIsAddressDiscoveryInProgress,
    selectManualHdSyncTerminalStatus,
    selectAccountIdInManualHdSync,
    selectIsAccountCompromised,
    selectAccountFlaggedExploits,
    selectFlaggedExploitsByAccount,
    selectSecurityScanState,
    selectNeedsSecurityRescan,
  },
  ...collateralFlowSelectors,
};

export type CardanoContextStoreState = StateFromReducersMapObject<
  typeof cardanoContextReducers
>;
