import { describe, expect, it } from 'vitest';

import { poolShortLabel } from '../../../src/design-system/util/text-utils';

const POOL_ID = 'pool1xt0gxs63r5vgjsrzhm7jfuhuqzga9pf8kqvp38qmdzn3wjxudvr';

describe('poolShortLabel', () => {
  it('prefers the ticker when the pool published one', () => {
    expect(poolShortLabel('ANGEL', POOL_ID)).toBe('ANGEL');
  });

  it('treats a blank or absent ticker as none', () => {
    for (const ticker of [null, undefined, '', '   ']) {
      expect(poolShortLabel(ticker, POOL_ID)).not.toBe(ticker);
      expect(poolShortLabel(ticker, POOL_ID)).toContain('...');
    }
  });

  /**
   * Every bech32 pool id opens with `pool1`, so a prefix-only truncation would
   * render every ticker-less pool identically — which is the whole problem with
   * `??`. The tail has to survive.
   */
  it('keeps the tail, which is the part that distinguishes one pool from another', () => {
    const label = poolShortLabel(null, POOL_ID);
    expect(label.startsWith('pool1')).toBe(true);
    expect(label.endsWith(POOL_ID.slice(-4))).toBe(true);

    const other = `${POOL_ID.slice(0, -4)}zzzz`;
    expect(poolShortLabel(null, other)).not.toBe(label);
  });

  it('leaves an id short enough to show whole alone', () => {
    expect(poolShortLabel(null, 'pool1abcd')).toBe('pool1abcd');
  });
});
