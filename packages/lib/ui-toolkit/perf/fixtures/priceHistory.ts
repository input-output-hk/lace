/**
 * Deterministic PriceDataPoint series for the priceHistoryUtils
 * measureFunction benchmarks: one year of hourly points (8760), the worst
 * realistic input the price chart pipeline sees. Fixed epoch + arithmetic
 * walk — no Date.now()/Math.random().
 */
import type { PriceDataPoint } from '../../src';

const BASE_TS_UTC = Date.UTC(2025, 5, 1);
const MS_PER_HOUR = 3_600_000;

export const HOURLY_POINTS_PER_YEAR = 8760;

export const makePricePoints = (count: number): PriceDataPoint[] =>
  Array.from({ length: count }, (_, index) => {
    const timestamp = BASE_TS_UTC + index * MS_PER_HOUR;
    return {
      timestamp,
      price: 0.5 + ((index * 37) % 500) / 1000,
      date: `${String((((index / 24) | 0) % 28) + 1).padStart(2, '0')}/06`,
    };
  });
