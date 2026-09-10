import { getAdaTokenTickerByNetwork } from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { useCallback, useMemo } from 'react';

import {
  useDispatchLaceAction,
  useLaceSelector,
  useStakePools,
} from '../../hooks';
import { getPoolDisplayData } from '../new-delegation/utils';
import { useAdaPrice } from '../useAdaPrice';

import type { Cardano } from '@cardano-sdk/core';
import type { SheetScreenProps } from '@lace-lib/navigation';
import type {
  PoolDetailsSheetProps,
  PoolStatistic,
} from '@lace-lib/ui-toolkit';

export const useStakePoolDetails = (
  params: SheetScreenProps<SheetRoutes.StakePoolDetails>['route']['params'],
) => {
  const { poolId, accountId, poolSelectionId } = params;
  const { t } = useTranslation();
  const networkType = useLaceSelector('network.selectNetworkType');
  const adaDisplayTicker = useMemo(
    () => getAdaTokenTickerByNetwork(networkType),
    [networkType],
  );

  const [stakePool] = useStakePools(poolId as Cardano.PoolId, true);
  const { adaPrice } = useAdaPrice();

  // Callbacks
  const handleCancelPress = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.BrowsePool, params);
  }, [params]);

  const poolSelectionMade = useDispatchLaceAction(
    'cardanoStakePools.poolSelectionMade',
  );

  const handleStakePress = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.NewDelegation, {
      poolId,
      accountId,
    });
  }, [poolId, accountId]);

  // Selection mode: another flow sent the user here to PICK a pool, not to
  // stake from the picker. Dispatch only — the sending flow watches for its
  // own selectionId and drives its own navigation, so this screen needs no
  // knowledge of who asked (ADR 14 keeps modules apart; the slice is the
  // meeting point).
  const handleSelectPress = useCallback(() => {
    if (!poolSelectionId || !stakePool) return;
    poolSelectionMade({
      selectionId: poolSelectionId,
      poolId: stakePool.poolId,
      ticker: stakePool.ticker,
      poolName: stakePool.poolName,
      // The details figure (live pledge included), not the list's summary
      // estimate — the consumer states this rate next to the user's choice.
      ros: stakePool.ros,
    });
  }, [poolSelectionId, stakePool, poolSelectionMade]);

  // Map stake pool data to PoolDetailsSheetProps
  const stakePoolDetailsProps = useMemo<
    | (PoolDetailsSheetProps & { statisticsMap: Record<string, PoolStatistic> })
    | null
  >(() => {
    if (!stakePool) return null;

    const poolData = getPoolDisplayData(stakePool, adaPrice);

    // Build statistics array
    const statisticsMap: Record<string, PoolStatistic> = {
      activeStake: {
        label: t('v2.regular-pool.active-stake'),
        value: poolData.activeStakeAda,
      },
      liveStake: {
        label: t('v2.regular-pool.live-stake'),
        value: poolData.liveStakeAda,
      },
      delegators: {
        label: t('v2.regular-pool.delegators'),
        value: poolData.delegators,
      },
      poolMargin: {
        label: t('v2.regular-pool.pool-margin'),
        value: `${poolData.marginPercentage}%`,
      },
      blocks: {
        label: t('v2.regular-pool.blocks'),
        value: poolData.blocks,
      },
      costPerEpoch: {
        label: t('v2.regular-pool.cost-per-epoch'),
        value: poolData.costAda,
      },
      pledge: {
        label: t('v2.regular-pool.pledge'),
        value: poolData.pledgeAda,
      },
      ros: {
        label: t('v2.regular-pool.ros'),
        value: `${poolData.rosPercentage}%`,
      },
    };

    // Add ADA denomination to statistics displayed in PoolDetailsSheet
    const statistics: Record<string, PoolStatistic> = {
      ...statisticsMap,
      activeStake: {
        ...statisticsMap.activeStake,
        value: `${poolData.activeStakeAda} ${adaDisplayTicker}`,
      },
      liveStake: {
        ...statisticsMap.liveStake,
        value: `${poolData.liveStakeAda} ${adaDisplayTicker}`,
      },
      costPerEpoch: {
        ...statisticsMap.costPerEpoch,
        value: `${poolData.costAda} ${adaDisplayTicker}`,
      },
      pledge: {
        ...statisticsMap.pledge,
        value: `${poolData.pledgeAda} ${adaDisplayTicker}`,
      },
    };

    // Get pool IDs (hex and bech32)
    const poolIds = [stakePool.poolId, stakePool.hexId] as string[];

    return {
      headerTitle: t('v2.pages.pool-details.title'),
      poolAvatarFallback: poolData.poolAvatarFallback,
      poolName: poolData.poolName,
      poolTicker: poolData.poolTicker,
      statisticsLabel: t('v2.pages.pool-details.statistics'),
      saturationLabel: t('v2.pages.pool-details.saturation'),
      saturationPercentage: poolData.saturationPercentage,
      statistics: Object.values(statistics),
      statisticsMap,
      informationLabel: t('v2.pages.pool-details.information'),
      informationText: stakePool.description ?? '',
      poolIdsLabel: t('v2.pages.pool-details.pool-ids'),
      poolIds,
      ownerIds: stakePool.owners,
      ownersLabel: t('v2.pages.pool-details.owners'),
      onCancelPress: handleCancelPress,
      onStakePress: poolSelectionId ? handleSelectPress : handleStakePress,
      cancelButtonLabel: t('v2.generic.cancel'),
      stakeButtonLabel: poolSelectionId
        ? t('v2.pages.pool-details.select-button')
        : t('v2.sheets.stake-delegation.delegate-button'),
    };
  }, [
    adaDisplayTicker,
    adaPrice,
    stakePool,
    poolSelectionId,
    handleCancelPress,
    handleSelectPress,
    handleStakePress,
    t,
  ]);

  return stakePoolDetailsProps;
};
