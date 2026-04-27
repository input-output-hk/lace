import {
  createSlotTimeCalc,
  epochSlotsCalc,
  Cardano,
  type EraSummary,
} from '@cardano-sdk/core';
import { useAnalytics } from '@lace-contract/analytics';
import {
  convertLovelacesToAda,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { SheetRoutes } from '@lace-lib/navigation';
import { useTheme } from '@lace-lib/ui-toolkit';
import { getOption, getOrder } from '@lace-lib/ui-toolkit';
import {
  compactNumberWithUnit,
  formatEpochEnd,
  UnitThreshold,
} from '@lace-lib/util-render';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLaceSelector, useSearchStakePools } from '../../hooks';
import { formatPercentages } from '../../utils/formatting';

import type { LacePartialStakePool } from '@lace-contract/cardano-stake-pools';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { SheetScreenProps } from '@lace-lib/navigation';
import type {
  BrowsePoolProps,
  BrowsePoolSortOption,
  BrowsePoolSortOrder,
} from '@lace-lib/ui-toolkit';
import type { LayoutSize } from '@lace-lib/ui-toolkit';

const GRID_COLUMNS: Record<LayoutSize, number> = {
  compact: 2,
  medium: 3,
  large: 4,
};

const calculateEpochFromSlot = (
  slot: Cardano.Slot,
  eraSummaries: readonly EraSummary[],
): Cardano.EpochNo => {
  const mutableEraSummaries = eraSummaries as EraSummary[];
  // Find the era that contains this slot
  for (let index = mutableEraSummaries.length - 1; index >= 0; index--) {
    const era = mutableEraSummaries[index];
    if (slot >= era.start.slot) {
      const slotsSinceEraStart = slot - era.start.slot;
      const epochLength = era.parameters.epochLength;
      const epoch = Math.floor(slotsSinceEraStart / epochLength);
      // Find the starting epoch of this era
      let startingEpoch = 0;
      for (let index_ = 0; index_ < index; index_++) {
        const previousEra = mutableEraSummaries[index_];
        const previousEpochLength = previousEra.parameters.epochLength;
        const previousEraSlots =
          (mutableEraSummaries[index_ + 1]?.start.slot ?? Infinity) -
          previousEra.start.slot;
        startingEpoch += Math.floor(previousEraSlots / previousEpochLength);
      }
      return Cardano.EpochNo(startingEpoch + epoch);
    }
  }
  return Cardano.EpochNo(0);
};

const calculateEpochEnd = (
  currentEpoch: Cardano.EpochNo,
  eraSummaries: readonly EraSummary[],
): Date => {
  const nextEpoch = (currentEpoch + 1) as Cardano.EpochNo;
  const mutableEraSummaries = eraSummaries as EraSummary[];
  const slotTimeCalc = createSlotTimeCalc(mutableEraSummaries);
  return slotTimeCalc(epochSlotsCalc(nextEpoch, mutableEraSummaries).firstSlot);
};

type PoolComparator = (
  a: LacePartialStakePool,
  b: LacePartialStakePool,
) => number;

const createSorterByTicker = (isAsc: boolean): PoolComparator => {
  const placeholder = isAsc ? '\uFFFD' : '';
  return (a, b) => {
    const textA = (a.ticker ?? placeholder).toLowerCase();
    const textB = (b.ticker ?? placeholder).toLowerCase();
    return isAsc ? textA.localeCompare(textB) : textB.localeCompare(textA);
  };
};

type AllKeys = keyof LacePartialStakePool;
type NumericKeys = {
  [K in AllKeys]: LacePartialStakePool[K] extends number ? K : never;
}[AllKeys];
const createNumericSorter =
  (attribute: NumericKeys) =>
  (isAsc: boolean): PoolComparator => {
    return (a, b) => {
      const valueA = a[attribute];
      const valueB = b[attribute];
      return isAsc ? valueA - valueB : valueB - valueA;
    };
  };

const partialPoolSorterFactories = new Map<
  BrowsePoolSortOption,
  (isAsc: boolean) => PoolComparator
>([
  ['ticker', createSorterByTicker],
  ['saturation', createNumericSorter('liveSaturation')],
  ['cost', createNumericSorter('cost')],
  ['margin', createNumericSorter('margin')],
  ['blocks', createNumericSorter('blocks')],
  ['pledge', createNumericSorter('declaredPledge')],
  ['liveStake', createNumericSorter('liveStake')],
]);

const getSorter = (field: BrowsePoolSortOption, order: BrowsePoolSortOrder) => {
  const isAsc = order === 'asc';
  const factory = partialPoolSorterFactories.get(field);

  if (!factory) throw new Error(`${String(field)}: Sort field not supported`);

  return factory(isAsc);
};

export const useBrowsePool = ({
  searchQuery,
  accountId,
  browsePoolSortOption,
  browsePoolSortOrder,
}: SheetScreenProps<SheetRoutes.BrowsePool>['route']['params']): BrowsePoolProps => {
  const { t } = useTranslation();
  const { layoutSize, theme } = useTheme();
  const [searchValue, setSearchValue] = useState(searchQuery || '');
  const networkType = useLaceSelector('network.selectNetworkType');

  const { pools, isLoading, totalPoolsCount } =
    useSearchStakePools(searchValue);

  const accounts = useLaceSelector('cardanoContext.selectRewardAccountDetails');
  const poolId = accounts[accountId as AccountId]?.rewardAccountInfo.poolId;

  const { selectedOption, selectedOrder, sortedPools } = useMemo(() => {
    const selectedOption = getOption(browsePoolSortOption);
    const selectedOrder = getOrder(browsePoolSortOrder, selectedOption);
    const filtered = poolId
      ? pools.filter(pool => pool.poolId !== poolId)
      : pools;
    if (!selectedOption || !selectedOrder) return { sortedPools: filtered };
    const sorted = [...filtered].sort(getSorter(selectedOption, selectedOrder));
    return { selectedOption, selectedOrder, sortedPools: sorted };
  }, [browsePoolSortOption, browsePoolSortOrder, poolId, pools]);

  const tip = useLaceSelector('cardanoContext.selectTip');
  const networkData = useLaceSelector(
    'cardanoStakePools.selectActiveNetworkData',
  );
  const eraSummaries = useLaceSelector('cardanoContext.selectEraSummaries');

  const numberOfColumns = useMemo(() => GRID_COLUMNS[layoutSize], [layoutSize]);

  // Calculate epoch end timestamp
  const epochEndTimestamp = useMemo<number | undefined>(() => {
    if (!tip || !eraSummaries) return undefined;

    const currentEpoch = calculateEpochFromSlot(tip.slot, eraSummaries);
    const epochEndDate = calculateEpochEnd(currentEpoch, eraSummaries);
    return epochEndDate.getTime();
  }, [tip, eraSummaries]);

  // Format endEpochValue with interval that updates every second
  const [endEpochValueFormatted, setEndEpochValueFormatted] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    if (epochEndTimestamp === undefined) {
      setEndEpochValueFormatted(undefined);
      return;
    }

    const timestamp = epochEndTimestamp;

    // Format immediately
    setEndEpochValueFormatted(formatEpochEnd(timestamp));

    // Update every second
    const interval = setInterval(() => {
      setEndEpochValueFormatted(formatEpochEnd(timestamp));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [epochEndTimestamp]);

  const networkInfoValues = useMemo(() => {
    // Calculate currentEpochValue (require tip and eraSummaries)
    const currentEpochValue =
      !tip || !eraSummaries
        ? undefined
        : String(Number(calculateEpochFromSlot(tip.slot, eraSummaries)));

    const totalPoolsValue = String(totalPoolsCount);

    let stakedValue: string | undefined;
    if (!networkData) stakedValue = undefined;
    else {
      const { liveStake, maxLovelaceSupply, reserves } = networkData;
      const circulating = maxLovelaceSupply - reserves;
      const stakedPercentage = circulating > 0 ? liveStake / circulating : 0;
      stakedValue = `${formatPercentages(stakedPercentage)} %`;
    }

    return {
      currentEpochValue,
      endEpochValue: endEpochValueFormatted,
      totalPoolsValue,
      stakedValue,
    };
  }, [tip, networkData, eraSummaries, endEpochValueFormatted, totalPoolsCount]);

  const { trackEvent } = useAnalytics();
  const sortedPoolsRef = useRef(sortedPools);
  sortedPoolsRef.current = sortedPools;

  const hasTrackedSearchRef = useRef(false);
  useEffect(() => {
    if (!searchValue) {
      hasTrackedSearchRef.current = false;
      return;
    }
    if (hasTrackedSearchRef.current) return;
    const timer = setTimeout(() => {
      trackEvent('staking | pool | search | changed');
      hasTrackedSearchRef.current = true;
    }, 500);
    return () => {
      clearTimeout(timer);
    };
  }, [searchValue, trackEvent]);

  const handleFilterPress = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.BrowsePoolFilterControls, {
      accountId,
      searchQuery: searchValue,
      browsePoolSortOption: selectedOption,
      browsePoolSortOrder: selectedOrder,
    });
  }, [accountId, searchValue, selectedOption, selectedOrder]);

  const handlePoolPress = useCallback(
    (poolId: string) => {
      const pool = sortedPoolsRef.current?.find(p => p.poolId === poolId);
      trackEvent(
        'staking | pool | press',
        pool?.ticker ? { ticker: pool.ticker } : undefined,
      );
      NavigationControls.sheets.navigate(SheetRoutes.StakePoolDetails, {
        poolId,
        searchQuery: searchValue,
        accountId,
        browsePoolSortOption: selectedOption,
        browsePoolSortOrder: selectedOrder,
      });
    },
    [accountId, searchValue, selectedOption, selectedOrder, trackEvent],
  );

  const displayLovelaces = useMemo(() => {
    const adaTokenTicker = getAdaTokenTickerByNetwork(networkType);
    return (lovelaces: number) =>
      `${compactNumberWithUnit(
        convertLovelacesToAda(lovelaces),
        0,
        UnitThreshold.THOUSAND,
      )} ${adaTokenTicker}`;
  }, [networkType]);

  return {
    data: sortedPools,
    cardVariant: selectedOption,
    displayLovelaces,
    isLoading,
    numberOfColumns,
    searchPlaceholder: t('v2.pages.browse-pool.search-placeholder'),
    theme,
    networkInfoValues,
    searchValue,
    onSearchChange: setSearchValue,
    onFilterPress: handleFilterPress,
    onPoolPress: handlePoolPress,
    hasActiveFilters: Boolean(selectedOption),
  };
};
