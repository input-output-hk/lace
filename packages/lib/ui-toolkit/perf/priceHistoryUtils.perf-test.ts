/**
 * measureFunction benchmarks for the price-chart data pipeline
 * (utils/priceHistoryUtils): the only barrel utils with real per-render /
 * per-frame cost. Input is one year of hourly points (8760) — the worst
 * realistic series the pipeline sees. browsePoolUtils was audited and is all
 * O(1) lookups, so it has no measureFunction value.
 */
import { measureFunction } from 'reassure';

import { downsampleDataPoints, getPriceDataForDragPosition } from '../src';

import {
  HOURLY_POINTS_PER_YEAR,
  makePricePoints,
} from './fixtures/priceHistory';

const yearOfPoints = makePricePoints(HOURLY_POINTS_PER_YEAR);
const CHART_POINTS = 100;

// measureFunction reports count: 1 by construction, so these suites are
// informational for the gate (duration only). The assertion is their
// integrity check against a fixture that silently shrinks.
test('downsampleDataPoints — 8760 hourly points → 100', async () => {
  expect(downsampleDataPoints(yearOfPoints, CHART_POINTS)).toHaveLength(
    CHART_POINTS,
  );

  await measureFunction(() => downsampleDataPoints(yearOfPoints, CHART_POINTS));
});

/**
 * The per-drag-frame path of the chart scrubber: maps the finger position to
 * a data index, then linear-scans the full series for the closest point
 * (lodash minBy). Runs on EVERY drag frame, so a regression here is felt as
 * scrub jank.
 */
const chartData = {
  data: yearOfPoints.map(point => point.price),
  timestamps: yearOfPoints.map(point => point.timestamp),
};
const timeRangeData = {
  '24H': yearOfPoints,
  '7D': yearOfPoints,
  '1M': yearOfPoints,
  '1Y': yearOfPoints,
};

test('getPriceDataForDragPosition — drag frame over 8760 points', async () => {
  await measureFunction(() =>
    getPriceDataForDragPosition(180, 360, chartData, timeRangeData, '1Y'),
  );
});
