/**
 * Deterministic LaceBrowsePool rows for the PoolCard benchmark, in the shape
 * the browse-pool page feeds each card. displayLovelaces mirrors the
 * production implementation (staking-center's useBrowsePool): lovelace → ADA
 * → compactNumberWithUnit + ticker, so the formatter cost measured is the
 * real one. No Date.now()/Math.random().
 */
import { compactNumberWithUnit } from '@lace-lib/util-render';

import type { LaceBrowsePool } from '@lace-contract/cardano-stake-pools';

const TICKERS = ['IOG', 'BLADE', 'OCTAS', 'EMUR', 'WAVE', null];
const LOVELACES_PER_ADA = 1_000_000;

export const makeBrowsePools = (count: number): LaceBrowsePool[] =>
  Array.from({ length: count }, (_, index) => ({
    poolId: `pool1${String(index).padStart(8, '0')}`,
    ticker: TICKERS[index % TICKERS.length],
    liveSaturation: (index * 7) % 100,
    cost: 340_000_000 + index * LOVELACES_PER_ADA,
    margin: ((index * 3) % 10) / 100,
    blocks: 1000 + index * 37,
    declaredPledge: (index + 1) * 100_000 * LOVELACES_PER_ADA,
    liveStake: (index + 1) * 1_000_000 * LOVELACES_PER_ADA,
  }));

export const displayLovelaces = (lovelaces: number): string =>
  `${compactNumberWithUnit((lovelaces / LOVELACES_PER_ADA).toString(), 0)} ADA`;
