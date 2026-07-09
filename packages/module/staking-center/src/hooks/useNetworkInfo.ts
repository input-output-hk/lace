import { formatEpochEnd } from '@lace-lib/util-render';
import { useEffect, useMemo, useState } from 'react';

import { useLaceSelector, useSearchStakePools } from '../hooks';
import { calculateEpochEnd, calculateEpochFromSlot } from '../utils/epochUtils';
import { formatPercentages } from '../utils/formatting';

import type { NetworkInfoCardProps } from '@lace-lib/ui-toolkit';

export const useNetworkInfo = (): NetworkInfoCardProps => {
  const tip = useLaceSelector('cardanoContext.selectTip');
  const eraSummaries = useLaceSelector('cardanoContext.selectEraSummaries');
  const networkData = useLaceSelector(
    'cardanoStakePools.selectActiveNetworkData',
  );
  const { isLoading, totalPoolsCount } = useSearchStakePools('');

  const epochEndTimestamp = useMemo<number | undefined>(() => {
    if (!tip || !eraSummaries) return undefined;
    const currentEpoch = calculateEpochFromSlot(tip.slot, eraSummaries);
    return calculateEpochEnd(currentEpoch, eraSummaries).getTime();
  }, [tip, eraSummaries]);

  const [endEpochValue, setEndEpochValue] = useState<string | undefined>(() =>
    epochEndTimestamp !== undefined
      ? formatEpochEnd(epochEndTimestamp)
      : undefined,
  );

  useEffect(() => {
    if (epochEndTimestamp === undefined) {
      setEndEpochValue(undefined);
      return;
    }
    setEndEpochValue(formatEpochEnd(epochEndTimestamp));
    const interval = setInterval(() => {
      setEndEpochValue(formatEpochEnd(epochEndTimestamp));
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [epochEndTimestamp]);

  return useMemo((): NetworkInfoCardProps => {
    const currentEpochValue =
      !tip || !eraSummaries
        ? undefined
        : String(Number(calculateEpochFromSlot(tip.slot, eraSummaries)));

    const totalPoolsValue = isLoading ? undefined : String(totalPoolsCount);

    let stakedValue: string | undefined;
    if (networkData) {
      const { liveStake, maxLovelaceSupply, reserves } = networkData;
      const circulating = maxLovelaceSupply - reserves;
      const stakedPercentage = circulating > 0 ? liveStake / circulating : 0;
      stakedValue = `${formatPercentages(stakedPercentage)} %`;
    }

    return { currentEpochValue, endEpochValue, totalPoolsValue, stakedValue };
  }, [
    tip,
    eraSummaries,
    networkData,
    isLoading,
    totalPoolsCount,
    endEpochValue,
  ]);
};
