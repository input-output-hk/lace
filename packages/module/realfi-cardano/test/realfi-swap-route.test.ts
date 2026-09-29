import { beforeEach, describe, expect, it, vi } from 'vitest';

const { quoteSwap } = vi.hoisted(() => ({ quoteSwap: vi.fn() }));

vi.mock('@realfi-co/realfi-partner-sdk', () => ({
  SundaeSwap: {
    DEFAULT_V4_FANOUT_POOLS: 2,
    isSupportedSundaeSwapVersion: (version: string) =>
      version === 'V3' || version === 'Stableswaps',
    filterQuotableV4Pools: (pools: IPoolData[]) =>
      pools.filter(
        pool => String(pool.version) === 'V4' && pool.ident !== 'v4-bad',
      ),
    selectV4QuotePool: (pools: IPoolData[]) => pools[0],
    quoteSwap,
  },
}));

import {
  routablePools,
  routeFeeFraction,
  routeVenue,
  selectSwapRoute,
} from '../src/realfi-swap-route';

import type { IPoolData } from '@sundaeswap/core';

const USDR = 'usdr.55534472';
const USDCX = 'usdcx.5553444378';

const pool = (ident: string, version: string, counterpart = USDCX) =>
  ({
    ident,
    version,
    assetA: { assetId: counterpart, decimals: 6 },
    assetB: { assetId: USDR, decimals: 6 },
    currentFee: 0.003,
    protocolFee: 0.001,
  } as unknown as IPoolData);

/** A quote guaranteeing `minReceived` USDr. */
const quote = (minReceived: bigint) => ({
  estimatedReceived: { amount: minReceived },
  minReceived: { amount: minReceived },
  priceImpact: 0.001,
});

/** Quote V4 (candidates) and single-pool targets from separate tables. */
const quoteBy = ({
  v4,
  pools = {},
}: {
  v4?: Error | bigint;
  pools?: Record<string, bigint>;
}) =>
  quoteSwap.mockImplementation(
    (params: { pool?: IPoolData; candidates?: IPoolData[] }) => {
      if (params.candidates) {
        if (v4 instanceof Error) throw v4;
        return quote(v4 ?? 0n);
      }
      return quote(pools[params.pool?.ident ?? ''] ?? 0n);
    },
  );

const select = (pools: IPoolData[]) =>
  selectSwapRoute({
    pools,
    counterpartSundaeId: USDCX,
    suppliedAmount: 10_000_000n,
    slippage: 0.03,
  });

describe('selectSwapRoute', () => {
  beforeEach(() => {
    quoteSwap.mockReset();
  });

  it('routes V4-only liquidity (mainnet today) through a V4 candidate set', () => {
    quoteBy({ v4: 9_900_000n });
    const route = select([pool('v4-a', 'V4'), pool('v4-b', 'V4')]);
    expect(route.kind).toBe('v4');
    expect(route.kind === 'v4' && route.candidates.map(p => p.ident)).toEqual([
      'v4-a',
      'v4-b',
    ]);
    expect(quoteSwap).toHaveBeenCalledWith(
      expect.objectContaining({ maxPools: 2, slippage: 0 }),
    );
  });

  it('prefers V4 over a V3/Stableswaps pool even when the pool quotes more', () => {
    quoteBy({ v4: 9_600_000n, pools: { v3: 9_700_000n } });
    expect(select([pool('v3', 'V3'), pool('v4', 'V4')]).kind).toBe('v4');
    // Settled on V4 without pricing the pools it outranks.
    expect(quoteSwap).toHaveBeenCalledTimes(1);
  });

  it('picks the V3/Stableswaps pool guaranteeing the most USDr when no V4 pool exists', () => {
    quoteBy({ pools: { v3: 9_600_000n, stable: 9_700_000n } });
    const route = select([pool('v3', 'V3'), pool('stable', 'Stableswaps')]);
    expect(route.kind === 'pool' && route.pool.ident).toBe('stable');
  });

  it('falls back to V3/Stableswaps when V4 cannot settle the amount', () => {
    quoteBy({ v4: new Error('liquidity'), pools: { v3: 9_700_000n } });
    expect(select([pool('v3', 'V3'), pool('v4', 'V4')]).kind).toBe('pool');
  });

  it('surfaces the V4 liquidity error when V4 is the only route', () => {
    quoteBy({ v4: new Error('Sundae V4 pools hold too little') });
    expect(() => select([pool('v4', 'V4')])).toThrow('too little');
  });

  it('throws when the pair has no composable pool', () => {
    expect(() =>
      select([pool('v1', 'V1'), pool('other', 'V3', 'ada.lovelace')]),
    ).toThrow(`No composable SundaeSwap pool available for USDr/${USDCX}`);
    expect(quoteSwap).not.toHaveBeenCalled();
  });
});

describe('routablePools', () => {
  it('keeps V3/Stableswaps and quotable V4 pools only', () => {
    const pools = [
      pool('v3', 'V3'),
      pool('stable', 'Stableswaps'),
      pool('v4', 'V4'),
      pool('v4-bad', 'V4'),
      pool('v1', 'V1'),
    ];
    expect(routablePools(pools).map(p => p.ident)).toEqual([
      'v3',
      'stable',
      'v4',
    ]);
  });
});

describe('route display', () => {
  it('names the venue and fee of the chosen route', () => {
    const v4 = {
      kind: 'v4' as const,
      candidates: [pool('v4', 'V4')],
      quote: quote(1n) as never,
    };
    const stable = {
      kind: 'pool' as const,
      pool: pool('stable', 'Stableswaps'),
      quote: quote(1n) as never,
    };
    expect(routeVenue(v4)).toBe('SundaeSwap V4');
    expect(routeVenue(stable)).toBe('SundaeSwap Stableswaps');
    expect(routeFeeFraction(v4)).toBeCloseTo(0.004);
  });
});
