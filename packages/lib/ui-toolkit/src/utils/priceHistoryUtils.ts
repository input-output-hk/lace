/* eslint-disable max-params */
import { format } from 'date-fns';
// eslint-disable-next-line lodash/import-scope
import { minBy } from 'lodash';

import type { PriceDataPoint, TimeRange } from '@lace-contract/token-pricing';

export type { PriceDataPoint, TimeRange };

export const RANGES: TimeRange[] = ['24H', '7D', '1M', '1Y'];

export type TimeRangePriceData = {
  [key in TimeRange]: PriceDataPoint[];
};

export type PriceHistoryData = {
  data: number[];
  timestamps: number[];
  priceData: TimeRangePriceData;
};

/**
 * Format timestamp to date string (MM/DD format)
 */
export const formatTimestampToDate = (timestamp: number): string => {
  return format(timestamp, 'MM/dd');
};

/**
 * Format price to USD string with commas
 */
export const formatPriceToUSD = (price: number): string => {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Get price data for a specific time range
 */
export const getPriceDataForTimeRange = (
  priceData: TimeRangePriceData,
  timeRange: TimeRange,
): PriceDataPoint[] => {
  return priceData[timeRange] || [];
};

/**
 * Find the closest price data point to a given timestamp
 */
export const findClosestPricePoint = (
  timestamp: number,
  pricePoints: PriceDataPoint[],
): PriceDataPoint | null => {
  if (pricePoints.length === 0) return null;

  return (
    minBy(pricePoints, point => Math.abs(timestamp - point.timestamp)) || null
  );
};

/**
 * Get the latest price data point for a time range
 */
export const getLatestPriceForTimeRange = (
  priceData: TimeRangePriceData,
  timeRange: TimeRange,
): PriceDataPoint | null => {
  const points = getPriceDataForTimeRange(priceData, timeRange);
  if (points.length === 0) return null;

  return points[points.length - 1];
};

/**
 * Downsample an array of PriceDataPoints to a maximum number of points
 */
export const downsampleDataPoints = (
  data: PriceDataPoint[],
  maxPoints: number,
): PriceDataPoint[] => {
  if (data.length <= maxPoints) return data;

  const bucketSize = Math.ceil(data.length / maxPoints);
  const downsampled: PriceDataPoint[] = [];

  for (let index = 0; index < data.length; index += bucketSize) {
    const bucket = data.slice(index, index + bucketSize);

    if (bucket.length > 0) {
      const avgTimestamp =
        bucket.reduce((sum, p) => sum + p.timestamp, 0) / bucket.length;

      const avgPrice =
        bucket.reduce((sum, p) => sum + p.price, 0) / bucket.length;

      downsampled.push({
        timestamp: avgTimestamp,
        price: avgPrice,
        date: formatTimestampToDate(avgTimestamp),
      });
    }
  }

  return downsampled;
};

/**
 * Map drag position to chart data index
 */
export const mapDragPositionToDataIndex = (
  dragX: number,
  chartWidth: number,
  dataLength: number,
  chartPadding: number = 20,
): number => {
  if (chartWidth <= 0 || dataLength <= 1) return 0;

  // Account for chart padding
  const availableWidth = chartWidth - chartPadding * 2;
  const normalizedX = Math.max(
    0,
    Math.min(dragX - chartPadding, availableWidth),
  );
  const normalizedPosition = normalizedX / availableWidth;

  // Map to data index
  const dataIndex = normalizedPosition * (dataLength - 1);
  return Math.max(0, Math.min(Math.round(dataIndex), dataLength - 1));
};

/**
 * Get price data for a specific drag position
 */
export const getPriceDataForDragPosition = (
  dragX: number,
  chartWidth: number,
  chartData: { data: number[]; timestamps?: number[] },
  timeRangePriceData: TimeRangePriceData,
  timeRange: TimeRange,
): PriceDataPoint | null => {
  if (!chartData.timestamps || chartData.timestamps.length === 0) {
    return null;
  }

  const dataIndex = mapDragPositionToDataIndex(
    dragX,
    chartWidth,
    chartData.data.length,
  );
  const timestamp = chartData.timestamps[dataIndex];

  if (!timestamp) return null;

  const pricePoints = getPriceDataForTimeRange(timeRangePriceData, timeRange);
  return findClosestPricePoint(timestamp, pricePoints);
};
