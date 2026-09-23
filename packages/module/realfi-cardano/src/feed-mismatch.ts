import type { RealFiSubmittedOrderTx } from '@lace-contract/realfi-staking';

/**
 * How long a submitted order tx may stay missing from the RealFi feed before
 * it counts as a mismatch. Normal indexer + batcher lag is well under a
 * minute; a confirmed order still unindexed past this means the feed is
 * missing data the chain has (a stalled backend indexer — the Sep 2026
 * preprod incident), not ordinary latency.
 */
const FEED_MISMATCH_GRACE_MS = 5 * 60_000;

/**
 * Whether any watched order tx proves the RealFi feed inconsistent with the
 * chain: confirmed on-chain, past the grace period, yet never returned by the
 * feed (an entry clears from the watch list the moment the feed knows it).
 * Only DIRECT orders qualify — any unstake, or a stake whose input was USDr —
 * because a swap-routed stake's tx creates a Sundae order the feed keys
 * differently, which would false-positive here. Drives the USDr detail's
 * feed-mismatch warning banner.
 */
export const hasFeedMismatch = (params: {
  orderTxs: RealFiSubmittedOrderTx[];
  /** Tx ids confirmed in the account's on-chain history. */
  confirmedTxIds: ReadonlySet<string>;
  usdrTokenId: string | undefined;
  nowMs: number;
}): boolean =>
  params.orderTxs.some(
    orderTx =>
      (orderTx.kind === 'unstake' ||
        (params.usdrTokenId !== undefined &&
          orderTx.inputTokenId === params.usdrTokenId)) &&
      params.nowMs - orderTx.recordedAt > FEED_MISMATCH_GRACE_MS &&
      params.confirmedTxIds.has(orderTx.txHash),
  );
