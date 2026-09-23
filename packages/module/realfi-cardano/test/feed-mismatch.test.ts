import { describe, expect, it } from 'vitest';

import { hasFeedMismatch } from '../src/feed-mismatch';

import type { RealFiSubmittedOrderTx } from '@lace-contract/realfi-staking';

const USDR = 'usdr-token';
// Pins the module-private FEED_MISMATCH_GRACE_MS: retuning the grace period
// is a behavior change this suite must notice.
const FEED_MISMATCH_GRACE_MS = 5 * 60_000;
const nowMs = 1_700_000_000_000;
const agedPastGrace = nowMs - FEED_MISMATCH_GRACE_MS - 1;

const orderTx = (
  overrides: Partial<RealFiSubmittedOrderTx> = {},
): RealFiSubmittedOrderTx => ({
  txHash: 'tx-1',
  recordedAt: agedPastGrace,
  kind: 'unstake',
  inputTokenId: 'susdr-token',
  ...overrides,
});

describe('hasFeedMismatch', () => {
  it('flags a confirmed unstake the feed still misses past the grace period', () => {
    expect(
      hasFeedMismatch({
        orderTxs: [orderTx()],
        confirmedTxIds: new Set(['tx-1']),
        usdrTokenId: USDR,
        nowMs,
      }),
    ).toBe(true);
  });

  it('stays quiet within the grace period (normal indexer lag)', () => {
    expect(
      hasFeedMismatch({
        orderTxs: [orderTx({ recordedAt: nowMs - FEED_MISMATCH_GRACE_MS })],
        confirmedTxIds: new Set(['tx-1']),
        usdrTokenId: USDR,
        nowMs,
      }),
    ).toBe(false);
  });

  it('stays quiet while the tx is not confirmed on-chain (dropped/pending tx)', () => {
    expect(
      hasFeedMismatch({
        orderTxs: [orderTx()],
        confirmedTxIds: new Set<string>(),
        usdrTokenId: USDR,
        nowMs,
      }),
    ).toBe(false);
  });

  it('flags a confirmed direct USDr stake, but never a swap-routed stake', () => {
    const direct = orderTx({ kind: 'stake', inputTokenId: USDR });
    const swapRouted = orderTx({ kind: 'stake', inputTokenId: 'lovelace' });
    const confirmedTxIds = new Set(['tx-1']);
    expect(
      hasFeedMismatch({
        orderTxs: [direct],
        confirmedTxIds,
        usdrTokenId: USDR,
        nowMs,
      }),
    ).toBe(true);
    expect(
      hasFeedMismatch({
        orderTxs: [swapRouted],
        confirmedTxIds,
        usdrTokenId: USDR,
        nowMs,
      }),
    ).toBe(false);
  });

  it('treats a stake as swap-routed when the USDr token id is unknown, but still flags unstakes', () => {
    const confirmedTxIds = new Set(['tx-1']);
    expect(
      hasFeedMismatch({
        orderTxs: [orderTx({ kind: 'stake', inputTokenId: USDR })],
        confirmedTxIds,
        usdrTokenId: undefined,
        nowMs,
      }),
    ).toBe(false);
    expect(
      hasFeedMismatch({
        orderTxs: [orderTx()],
        confirmedTxIds,
        usdrTokenId: undefined,
        nowMs,
      }),
    ).toBe(true);
  });

  it('is false with nothing watched', () => {
    expect(
      hasFeedMismatch({
        orderTxs: [],
        confirmedTxIds: new Set(['tx-1']),
        usdrTokenId: USDR,
        nowMs,
      }),
    ).toBe(false);
  });
});
