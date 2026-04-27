import type { LayoutChangeEvent, ViewStyle } from 'react-native';

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

import { getIsWideLayout } from '../..';
import { radius, spacing, useTheme } from '../../../design-tokens';
import {
  downsampleDataPoints,
  formatPriceToUSD,
  getLatestPriceForTimeRange,
  getPriceDataForDragPosition,
  getPriceDataForTimeRange,
  RANGES,
  type TimeRange,
} from '../../../utils/priceHistoryUtils';
import { BlurView, LineChart, PricePill } from '../../atoms';
import { Tabs } from '../tabs/tabs';

import type { Theme } from '../../../design-tokens';
import type {
  PriceDataPoint,
  PriceHistoryData,
  TimeRangePriceData,
} from '../../../utils/priceHistoryUtils';
import type { LineChartData } from '../../atoms';

type ChartProps = {
  data: LineChartData | PriceHistoryData;
  priceData?: {
    date: string;
    price: string;
    currency: string;
  };
  onTimeRangeChange?: (range: TimeRange) => void;
  timeRangePriceData?: TimeRangePriceData;
  timeRange?: TimeRange;
  showPricePill?: boolean;
  withCenterPill?: boolean;
};

export const Chart = ({
  data,
  priceData,
  timeRangePriceData,
  onTimeRangeChange,
  timeRange = '24H',
  showPricePill = true,
  withCenterPill = false,
}: ChartProps): React.JSX.Element => {
  const { theme } = useTheme();
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const { width } = useWindowDimensions();
  const isWideLayout = getIsWideLayout(width);
  const [currentPriceData, setCurrentPriceData] =
    useState<PriceDataPoint | null>(null);

  const styles = getStyles(theme);

  // Determine if we have enhanced data with timestamps
  const hasEnhancedData = 'timestamps' in data && 'priceData' in data;

  // Get chart data based on selected time range
  const chartData: LineChartData = useMemo(() => {
    if (hasEnhancedData && timeRangePriceData) {
      const timeRangeData = getPriceDataForTimeRange(
        timeRangePriceData,
        timeRange,
      );

      const chartWidthPx = chartSize.width > 0 ? chartSize.width : 300;
      const threshold = 400;

      const shouldDownsample = timeRangeData.length > threshold;
      const maxPoints = Math.floor(chartWidthPx);

      const finalData = shouldDownsample
        ? downsampleDataPoints(timeRangeData, maxPoints)
        : timeRangeData;

      return {
        data: finalData.map(p => p.price),
        timestamps: finalData.map(p => p.timestamp),
      };
    }

    return hasEnhancedData
      ? { data: data.data, timestamps: data.timestamps }
      : data;
  }, [hasEnhancedData, timeRangePriceData, timeRange, data, chartSize.width]);

  const handleChartLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setChartSize({ width, height });
  };

  // Get current price data based on time range
  const currentPriceForTimeRange = useMemo(() => {
    if (!timeRangePriceData) return null;
    return getLatestPriceForTimeRange(timeRangePriceData, timeRange);
  }, [timeRangePriceData, timeRange]);

  // Handle time range change
  const handleTimeRangeChange = useCallback(
    (range: TimeRange) => {
      // Update current price data for the new time range
      if (timeRangePriceData) {
        const latestPrice = getLatestPriceForTimeRange(
          timeRangePriceData,
          range,
        );
        setCurrentPriceData(latestPrice);
      }

      onTimeRangeChange?.(range);
    },
    [timeRangePriceData, onTimeRangeChange],
  );

  // Handle tabs change - wrapper for Tabs component
  const handleTabsChange = useCallback(
    (value: number | string) => {
      if (typeof value === 'string' && RANGES.includes(value as TimeRange)) {
        handleTimeRangeChange(value as TimeRange);
      }
    },
    [handleTimeRangeChange],
  );

  // Handle price pill drag update
  const handlePricePillDragUpdate = useCallback(
    (position: { x: number; y: number }) => {
      if (!hasEnhancedData || !timeRangePriceData || chartSize.width === 0)
        return;

      const pricePoint = getPriceDataForDragPosition(
        position.x,
        chartSize.width,
        chartData,
        timeRangePriceData,
        timeRange,
      );

      if (pricePoint) {
        setCurrentPriceData(pricePoint);
      }
    },
    [
      hasEnhancedData,
      timeRangePriceData,
      chartSize.width,
      chartSize.height,
      chartData,
      timeRange,
    ],
  );

  // Handle price pill drag end
  const handlePricePillDragEnd = useCallback(() => {
    // Reset to the latest price for the current time range when drag ends
    if (timeRangePriceData) {
      const latestPrice = getLatestPriceForTimeRange(
        timeRangePriceData,
        timeRange,
      );
      setCurrentPriceData(latestPrice);
    }
  }, [timeRangePriceData, timeRange]);

  const displayPriceData = useMemo(() => {
    // Priority: currentPriceData (from point selection) > currentPriceForTimeRange > priceData prop
    const pricePoint = currentPriceData || currentPriceForTimeRange;

    if (pricePoint) {
      return {
        date: pricePoint.date,
        price: formatPriceToUSD(pricePoint.price),
        currency: 'USD',
      };
    }

    return priceData;
  }, [currentPriceData, currentPriceForTimeRange, priceData]);

  const centeredStyle = useMemo(() => {
    return withCenterPill
      ? {
          position: 'absolute',
          left: !isWideLayout ? chartSize.width / 4 : chartSize.width / 2.8,
          top: chartSize.height / 3,
        }
      : styles.pricePillContainer;
  }, [
    withCenterPill,
    isWideLayout,
    chartSize.width,
    chartSize.height,
    styles.pricePillContainer,
  ]);

  return (
    <BlurView style={styles.container}>
      <View style={styles.chartContainer} onLayout={handleChartLayout}>
        <LineChart data={chartData} />

        {displayPriceData && showPricePill && (
          <View style={centeredStyle as ViewStyle} pointerEvents="box-none">
            <PricePill
              date={displayPriceData.date}
              price={displayPriceData.price}
              currency={displayPriceData.currency}
              dragBounds={chartSize}
              onDragUpdate={handlePricePillDragUpdate}
              onDragEnd={handlePricePillDragEnd}
              isInteractive={hasEnhancedData && !withCenterPill}
            />
          </View>
        )}

        {onTimeRangeChange && (
          <Tabs tabs={RANGES} value={timeRange} onChange={handleTabsChange} />
        )}
      </View>
    </BlurView>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      overflow: 'hidden',
      borderRadius: radius.MM,
      padding: spacing.L,
      gap: spacing.M,
      backgroundColor: theme.background.primary,
    },
    chartContainer: {
      height: 315,
    },
    pricePillContainer: {
      ...StyleSheet.absoluteFillObject,
    },
  });
