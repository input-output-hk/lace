/**
 * Swap→stake route selection across the SundaeSwap pool versions the partner
 * SDK can compose into a RealFi stake continuation: a single V3/Stableswaps
 * pool (`buildSwapToStakeOrderTx`) or a set of V4 candidates
 * (`buildV4SwapToStakeOrderTx`). V4 takes priority whenever it can quote the
 * amount (RealFi's routing requirement); V3/Stableswaps is the fallback.
 */
import { SundaeSwap } from '@realfi-co/realfi-partner-sdk';
import { AssetAmount, type IAssetAmountMetadata } from '@sundaeswap/asset';
import { type IPoolData } from '@sundaeswap/core';

/**
 * V4 fan-out: how many pools one intent may draw on. The quote and the built
 * intent's `maxPerExecution` must use the same value, or the signed floor can
 * need more pools than the order pays the scooper to reach.
 */
export const V4_MAX_POOLS = SundaeSwap.DEFAULT_V4_FANOUT_POOLS;

export type SwapRoute =
  | {
      kind: 'v4';
      candidates: IPoolData[];
      quote: SundaeSwap.ISundaeSwapQuote;
    }
  | { kind: 'pool'; pool: IPoolData; quote: SundaeSwap.ISundaeSwapQuote };

/**
 * The pools a swap→stake order can be built on: V3/Stableswaps pools, plus the
 * V4 pools the SDK can price (constant-sum, equal weights, matching decimals).
 */
export const routablePools = (pools: IPoolData[]): IPoolData[] => [
  ...pools.filter(pool =>
    SundaeSwap.isSupportedSundaeSwapVersion(pool.version),
  ),
  ...SundaeSwap.filterQuotableV4Pools(pools),
];

/** `amount` of `assetId`, carrying the pool's own metadata (decimals). */
export const poolAssetAmount = (
  pool: IPoolData,
  assetId: string,
  amount: bigint,
): AssetAmount<IAssetAmountMetadata> => {
  const side = pool.assetA.assetId === assetId ? pool.assetA : pool.assetB;
  return new AssetAmount<IAssetAmountMetadata>(amount, {
    assetId: side.assetId,
    decimals: side.decimals,
  });
};

/** Combined pool fee fraction (LP `currentFee` + `protocolFee`). */
const poolFeeFractionOf = (pool: IPoolData): number =>
  pool.currentFee + (pool.protocolFee ?? 0);

/**
 * The route's pool fee fraction. A V4 intent names no pool, so it is the fee
 * of the pool the SDK prices the quote against.
 */
export const routeFeeFraction = (route: SwapRoute): number => {
  if (route.kind === 'pool') return poolFeeFractionOf(route.pool);
  const quotePool = SundaeSwap.selectV4QuotePool(route.candidates);
  return quotePool ? poolFeeFractionOf(quotePool) : 0;
};

/** Display name of the route's swap venue. */
export const routeVenue = (route: SwapRoute): string =>
  `SundaeSwap ${route.kind === 'v4' ? 'V4' : route.pool.version}`;

/**
 * The swap route for `counterpartSundaeId` → USDr. V4 wins whenever its
 * candidates can settle the amount, regardless of what a V3/Stableswaps pool
 * would quote. Otherwise the V3/Stableswaps pool guaranteeing the most USDr
 * (`minReceived`, the floor that funds the stake) is used. A V4 liquidity
 * shortfall is rethrown only when no V3/Stableswaps pool exists, so the
 * caller surfaces it.
 */
export const selectSwapRoute = ({
  pools,
  counterpartSundaeId,
  suppliedAmount,
  slippage,
}: {
  pools: IPoolData[];
  counterpartSundaeId: string;
  /** Amount of the counterpart asset funding the swap (base units). */
  suppliedAmount: bigint;
  /** Market slippage for V3/Stableswaps; V4 constant-sum quotes ignore it. */
  slippage: number;
}): SwapRoute => {
  const pairPools = pools.filter(
    pool =>
      pool.assetA.assetId === counterpartSundaeId ||
      pool.assetB.assetId === counterpartSundaeId,
  );
  const candidates = SundaeSwap.filterQuotableV4Pools(pairPools);
  let v4Error: Error | undefined;
  if (candidates.length > 0) {
    try {
      return {
        kind: 'v4',
        candidates,
        quote: SundaeSwap.quoteSwap({
          candidates,
          maxPools: V4_MAX_POOLS,
          suppliedAsset: poolAssetAmount(
            candidates[0],
            counterpartSundaeId,
            suppliedAmount,
          ),
          slippage: 0,
        }),
      };
    } catch (error) {
      v4Error = error instanceof Error ? error : new Error(String(error));
    }
  }
  const [first, ...rest] = pairPools
    .filter(pool => SundaeSwap.isSupportedSundaeSwapVersion(pool.version))
    .map(
      (pool): SwapRoute => ({
        kind: 'pool',
        pool,
        quote: SundaeSwap.quoteSwap({
          pool,
          suppliedAsset: poolAssetAmount(
            pool,
            counterpartSundaeId,
            suppliedAmount,
          ),
          slippage,
        }),
      }),
    );
  if (!first) {
    if (v4Error) throw v4Error;
    throw new Error(
      `No composable SundaeSwap pool available for USDr/${counterpartSundaeId}`,
    );
  }
  return rest.reduce(
    (best, route) =>
      route.quote.minReceived.amount > best.quote.minReceived.amount
        ? route
        : best,
    first,
  );
};
