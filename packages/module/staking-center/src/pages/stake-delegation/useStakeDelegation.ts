import { useAnalytics } from '@lace-contract/analytics';
import { useConfig, useUICustomisation } from '@lace-contract/app';
import {
  ADA_DECIMALS,
  DEFAULT_DECIMALS,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { formatAndGroupActivitiesByDate } from '@lace-lib/ui-toolkit';
import {
  formatAmountToLocale,
  useDeepCompareMemo,
} from '@lace-lib/util-render';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import {
  useLaceSelector,
  useDispatchLaceAction,
  useIsDeregisterDisabled,
} from '../../hooks';

import type { Cardano } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  CardanoAddressData,
  Reward,
  CardanoRewardAccount,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type {
  FormattedActivityListItem,
  PoolDetailsSheetProps,
  PoolStatistic,
  RegularPoolSheetProps,
} from '@lace-lib/ui-toolkit';

type StakeDelegationOptions = {
  accountId: AccountId;
  rewardAccount: CardanoRewardAccount;
  stakePoolDetailsProps?:
    | (PoolDetailsSheetProps & { statisticsMap: Record<string, PoolStatistic> })
    | null;
  poolId?: Cardano.PoolId;
};
/**
 * Hook to get the reward account (stake key) for a given account ID.
 * Returns the first reward account found in the account's addresses.
 */
export const useRewardAccount = (
  accountId: AccountId,
): CardanoRewardAccount | undefined => {
  const addresses = useLaceSelector('addresses.selectByAccountId', accountId);

  return useMemo(() => {
    if (!addresses || addresses.length === 0) return undefined;
    // Get the first reward account from addresses
    const firstAddress = (addresses as AnyAddress<CardanoAddressData>[]).find(
      addr => addr?.data?.rewardAccount,
    );
    return firstAddress?.data?.rewardAccount;
  }, [addresses]);
};

const epochsFilterOptions = [5, 15];

const useEpochsFilter = () => {
  const [selectedEpochFilter, setSelectedEpochFilter] = useState(0);

  return {
    epochsFilterOptions,
    selectedEpochFilter,
    onEpochFilterChange: setSelectedEpochFilter,
  };
};

const useComputeEpochs = ({
  accountRewardsHistory,
  poolId,
  epochsFilterOptions,
  selectedEpochFilter,
}: {
  accountRewardsHistory: Reward[];
  poolId?: Cardano.PoolId;
  epochsFilterOptions: number[];
  selectedEpochFilter: number;
}) =>
  useMemo(() => {
    const emptyResult = { epochs: [], epochsScale: [] as number[] };

    if (accountRewardsHistory.length === 0) return emptyResult;

    // Filter rewards by poolId if provided
    const filteredRewards =
      poolId === undefined
        ? accountRewardsHistory
        : accountRewardsHistory.filter(reward => reward.poolId === poolId);

    if (filteredRewards.length === 0) return emptyResult;

    // Map rewards to epochs format (without progress yet)
    const epochsWithSortKey = filteredRewards
      .map((reward: Reward) => {
        const epochNumber = reward.epoch;
        if (!epochNumber) return null;

        const rewardsValue = Number(reward.rewards.toString());

        return {
          epoch: epochNumber.valueOf().toString(),
          rewardsValue,
          epochNumber: epochNumber.valueOf(),
        };
      })
      .filter(item => item !== null);

    if (epochsWithSortKey.length === 0) return emptyResult;

    // Sort by epoch (descending) and remove sort key
    const sortedEpochs = epochsWithSortKey
      .sort((a, b) => b.epochNumber - a.epochNumber)
      .map(({ epochNumber: _epochNumber, ...rest }) => rest);

    // Apply filter truncation based on selectedEpochFilter and epochsFilterOptions
    const allEpochs =
      epochsFilterOptions.length === 0
        ? sortedEpochs
        : sortedEpochs.slice(
            0,
            epochsFilterOptions[selectedEpochFilter] ?? sortedEpochs.length,
          );

    // Calculate min and max rewards for normalization from filtered epochs
    const rewardsValues = allEpochs.map(epoch => epoch.rewardsValue);
    const minRewards =
      rewardsValues.length > 0 ? Math.min(...rewardsValues) : 0;
    const maxRewards =
      rewardsValues.length > 0 ? Math.max(...rewardsValues) : 0;

    const midRewards = (minRewards + maxRewards) / 2;
    const quarterRewards = (minRewards + midRewards) / 2;
    const threeQuarterRewards = (midRewards + maxRewards) / 2;
    const epochsScale = [
      minRewards,
      quarterRewards,
      midRewards,
      threeQuarterRewards,
      maxRewards,
    ];

    // Calculate progress for each epoch normalized between min and max rewards
    // Minimum progress is set to 10% of the range
    const epochs = allEpochs.map(epoch => {
      let progress = 100;

      if (maxRewards > minRewards) {
        // Normalize between min and max, then scale to 10-100% range
        const normalizedValue =
          (epoch.rewardsValue - minRewards) / (maxRewards - minRewards);

        // Scale from [0, 1] to [0.1, 1.0] (10% to 100%)
        progress = (0.1 + normalizedValue * 0.9) * 100;
      }

      return {
        epoch: epoch.epoch,
        progress: Math.min(100, Math.max(0, progress)),
      };
    });

    return { epochs, epochsScale };
  }, [accountRewardsHistory, poolId, epochsFilterOptions, selectedEpochFilter]);

export const useStakeDelegation = ({
  accountId,
  rewardAccount,
  stakePoolDetailsProps,
  poolId,
}: StakeDelegationOptions) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  const networkType = useLaceSelector('network.selectNetworkType');
  const adaDisplayTicker = useMemo(
    () => getAdaTokenTickerByNetwork(networkType),
    [networkType],
  );

  // Get reward account details from store
  const rewardAccountDetailsMap = useLaceSelector(
    'cardanoContext.selectRewardAccountDetails',
  );
  const rewardAccountDetails = rewardAccountDetailsMap[accountId];

  const accountRewardsHistory = useLaceSelector(
    'cardanoContext.selectRewardsHistoryForAccount',
    accountId,
  );

  const totalStaked = formatAmountToLocale(
    rewardAccountDetails?.rewardAccountInfo.controlledAmount.toString() || '0',
    ADA_DECIMALS,
    DEFAULT_DECIMALS,
  );

  const totalRewards = formatAmountToLocale(
    rewardAccountDetails?.rewardAccountInfo.rewardsSum.toString() || '0',
    ADA_DECIMALS,
    DEFAULT_DECIMALS,
  );

  const isDeregisterDisabled = useIsDeregisterDisabled(
    rewardAccountDetails?.rewardAccountInfo,
  );

  const handleDeRegisterPress = useCallback(() => {
    trackEvent('staking | deregister | press');
    NavigationControls.sheets.navigate(SheetRoutes.DeregisterPool, {
      accountId: accountId.toString(),
    });
  }, [accountId, trackEvent]);

  const handleDelegatePress = useCallback(() => {
    trackEvent('staking | stake | press');
    // TODO: Implement delegate logic https://input-output.atlassian.net/browse/LW-14123
    NavigationControls.sheets.navigate(SheetRoutes.BrowsePool, {
      accountId: accountId.toString(),
    });
  }, [accountId, trackEvent]);

  const { epochsFilterOptions, selectedEpochFilter, onEpochFilterChange } =
    useEpochsFilter();
  const { epochs, epochsScale } = useComputeEpochs({
    accountRewardsHistory,
    poolId,
    epochsFilterOptions,
    selectedEpochFilter,
  });
  const { activities, triggerLoadAccountDelegations, isLoadingActivities } =
    useStakeDelegationActivities(accountId, rewardAccount);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      triggerLoadAccountDelegations();
    });
    return () => {
      handle.cancel();
    };
  }, [triggerLoadAccountDelegations]);

  // Get UI customizations for activities formatting
  const [address] = useLaceSelector('addresses.selectByAccountId', accountId);
  const [activitiesItemUICustomisation] = useUICustomisation(
    'addons.loadActivitiesItemUICustomisations',
    { blockchainName: address?.blockchainName },
  );
  const { appConfig } = useConfig();

  const handleActivityPress = useCallback(
    (id: string) => {
      if (activitiesItemUICustomisation?.onActivityClick) {
        activitiesItemUICustomisation.onActivityClick({
          activityId: id,
          address,
          config: appConfig,
        });
        return;
      }
      const activity = activities.find(a => a.activityId === id);
      NavigationControls.sheets.navigate(SheetRoutes.ActivityDetail, {
        activityId: id,
        activity,
      });
    },
    [activitiesItemUICustomisation, address, appConfig, activities],
  );

  // Get tokens metadata for activities formatting
  const tokensMetadataByTokenId = useLaceSelector(
    'tokens.selectTokensMetadata',
  );

  // Format and group activities by date
  const formattedActivitySections = useMemo(
    () =>
      formatAndGroupActivitiesByDate({
        activities,
        t,
        tokensMetadataByTokenId,
        getMainTokenBalanceChange:
          activitiesItemUICustomisation?.getMainTokenBalanceChange,
        getTokensInfoSummary:
          activitiesItemUICustomisation?.getTokensInfoSummary,
        preSorted: true,
      }),
    [activities, t, tokensMetadataByTokenId, activitiesItemUICustomisation],
  );

  // Transform ActivityCardProps to match RegularPoolSheetProps format
  const activitySections = useMemo(
    () =>
      formattedActivitySections.map(section => ({
        date: section.date,
        dateIcon: section.dateIcon,
        items: section.items.map((item: FormattedActivityListItem) => {
          const title =
            'info' in item && item.info?.title ? item.info.title : '';
          const subtitle =
            'info' in item && 'subtitle' in item.info && item.info.subtitle
              ? item.info.subtitle
              : '';
          const amount =
            'value' in item && 'title' in item.value && item.value.title?.amount
              ? item.value.title.amount
              : '';
          const coin =
            'value' in item && 'title' in item.value && item.value.title?.label
              ? item.value.title.label
              : '';

          return {
            id: item.id,
            rowKey: item.rowKey,
            title,
            subtitle: subtitle || '',
            amount,
            coin,
            iconName: item.iconName,
            iconBackground: item.iconBackground || 'secondary',
          };
        }),
      })),
    [formattedActivitySections],
  );

  // Build RegularPoolSheetProps
  const regularPoolSheetProps = useMemo<RegularPoolSheetProps | null>(() => {
    if (!stakePoolDetailsProps) return null;

    return {
      poolName: stakePoolDetailsProps.poolName,
      poolTicker: stakePoolDetailsProps.poolTicker,
      totalStaked,
      totalRewards,
      coin: adaDisplayTicker,
      stakeKey: rewardAccount.toString(),
      saturationPercentage: stakePoolDetailsProps.saturationPercentage,
      activeStake: stakePoolDetailsProps.statisticsMap.activeStake.value,
      liveStake: stakePoolDetailsProps.statisticsMap.liveStake.value,
      delegators: stakePoolDetailsProps.statisticsMap.delegators.value,
      blocks: stakePoolDetailsProps.statisticsMap.blocks.value,
      costPerEpoch: stakePoolDetailsProps.statisticsMap.costPerEpoch.value,
      pledge: stakePoolDetailsProps.statisticsMap.pledge.value,
      poolMargin: stakePoolDetailsProps.statisticsMap.poolMargin.value,
      ros: stakePoolDetailsProps.statisticsMap.ros.value,
      information: stakePoolDetailsProps.informationText || '',
      epochs,
      epochsScale,
      epochsFilterOptions,
      selectedEpochFilter,
      onEpochFilterChange,
      activitySections,
      primaryButtonLabel: t('v2.sheets.stake-delegation.update-button'),
      secondaryButtonLabel: t('v2.sheets.stake-delegation.deregister-button'),
      onPrimaryPress: handleDelegatePress,
      onSecondaryPress: handleDeRegisterPress,
      onActivityPress: handleActivityPress,
      isLoadingActivities,
      isSecondaryButtonDisabled: isDeregisterDisabled,
    };
  }, [
    stakePoolDetailsProps,
    rewardAccount,
    totalStaked,
    totalRewards,
    epochs,
    epochsScale,
    epochsFilterOptions,
    selectedEpochFilter,
    activitySections,
    handleDeRegisterPress,
    handleDelegatePress,
    handleActivityPress,
    isDeregisterDisabled,
    t,
    isLoadingActivities,
    adaDisplayTicker,
  ]);

  return regularPoolSheetProps;
};

export const useStakeDelegationActivities = (
  accountId: AccountId,
  rewardAccount: CardanoRewardAccount,
) => {
  const { t } = useTranslation();

  // Get the dispatch action for loadAccountDelegations
  const loadAccountDelegations = useDispatchLaceAction(
    'cardanoContext.loadAccountDelegationHistory',
  );

  const params = useDeepCompareMemo({ accountId, rewardAccount });

  const { activities, isLoadingActivities } = useLaceSelector(
    'cardanoContext.selectDelegationActivities',
    params,
  );

  const delegationError = useLaceSelector(
    'cardanoContext.selectDelegationError',
    params,
  );

  const showToast = useDispatchLaceAction('ui.showToast');
  const previousErrorRef = useRef<typeof delegationError>(undefined);

  // Show toast when error appears
  useEffect(() => {
    if (
      delegationError &&
      delegationError !== previousErrorRef.current &&
      !isLoadingActivities
    ) {
      showToast({
        text: t('v2.staking.delegation-history.error'),
        color: 'negative',
        duration: 5,
        leftIcon: {
          name: 'AlertTriangle',
          size: 20,
        },
      });
    }
    previousErrorRef.current = delegationError;
  }, [delegationError, isLoadingActivities, showToast, t]);

  // Clear history on unmount
  const clearAccountDelegationHistory = useDispatchLaceAction(
    'cardanoContext.clearAccountDelegationHistory',
  );

  useEffect(() => {
    return () => {
      // Cleanup on unmount - clears accountRewardsHistory, accountDelegationsHistory,
      // and delegationActivities
      clearAccountDelegationHistory({ accountId, rewardAccount });
    };
  }, [accountId, rewardAccount, clearAccountDelegationHistory]);

  const triggerLoadAccountDelegations = useCallback(() => {
    if (!rewardAccount) return;
    loadAccountDelegations({
      accountId,
      rewardAccount,
    });
  }, [accountId, rewardAccount, loadAccountDelegations]);

  return useMemo(
    () => ({
      triggerLoadAccountDelegations,
      isLoadingActivities: rewardAccount ? isLoadingActivities : false,
      activities: rewardAccount ? activities : [],
    }),
    [
      triggerLoadAccountDelegations,
      isLoadingActivities,
      activities,
      rewardAccount,
    ],
  );
};
