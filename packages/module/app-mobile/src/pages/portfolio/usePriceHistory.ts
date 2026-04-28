import { useCallback } from 'react';

import { useLaceSelector } from '../../hooks';

import type { TimeRange } from '@lace-lib/ui-toolkit';

interface UsePriceHistoryReturn {
  getPriceHistoryData: (range: TimeRange) => { data: number[] };
}

export const usePriceHistory = (
  timeRange: TimeRange,
): UsePriceHistoryReturn => {
  const historyData = useLaceSelector(
    'tokenPricing.selectPortfolioValueHistory',
    timeRange,
  );

  const getPriceHistoryData = useCallback(
    (range: TimeRange) => {
      // Only return data if it matches the current time range
      if (range !== timeRange || !historyData || historyData.length === 0) {
        return { data: [] };
      }

      return { data: historyData.map(point => point.price) };
    },
    [timeRange, historyData],
  );

  return {
    getPriceHistoryData,
  };
};
