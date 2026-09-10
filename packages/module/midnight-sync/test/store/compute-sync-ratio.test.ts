import { Percent } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import {
  computeConnectedSyncRatio,
  computeSyncRatio,
} from '../../src/store/compute-sync-ratio';

describe('computeSyncRatio', () => {
  it('returns Percent(1) when highest is 0n and applied is 0n', () => {
    expect(computeSyncRatio(0n, 0n)).toBe(Percent(0));
  });

  it('returns a logarithmic progress when highest is 0n and applied > 0n', () => {
    expect(computeSyncRatio(1000n, 0n)).toBe(Percent(0.5));
    expect(computeSyncRatio(3413n, 0n)).toBeCloseTo(0.773, 2);
    expect(computeSyncRatio(100000n, 0n)).toBe(Percent(0.99)); // capped at 0.99
  });

  it('returns Percent(0) when applied is 0n and highest is positive', () => {
    expect(computeSyncRatio(0n, 100n)).toBe(Percent(0));
  });

  it('returns Percent(1) when applied equals highest', () => {
    expect(computeSyncRatio(100n, 100n)).toBe(Percent(1));
  });

  it('returns a fractional value for partial progress', () => {
    expect(computeSyncRatio(50n, 100n)).toBe(Percent(0.5));
  });

  it('clamps to Percent(1) when applied exceeds highest', () => {
    expect(computeSyncRatio(150n, 100n)).toBe(Percent(1));
  });

  it('handles large bigint values', () => {
    const applied = 999_999_999n;
    const highest = 1_000_000_000n;
    const result = computeSyncRatio(applied, highest);
    expect(result).toBeCloseTo(0.999_999_999, 6);
  });
});

describe('computeConnectedSyncRatio', () => {
  it('returns Percent(1) when connected with 0n applied and 0n highest (nothing to sync)', () => {
    expect(computeConnectedSyncRatio(0n, 0n, true)).toBe(Percent(1));
  });
  it('returns Percent(0) when not connected with 0n applied and 0n highest (not yet connected)', () => {
    expect(computeConnectedSyncRatio(0n, 0n, false)).toBe(Percent(0));
  });
  it('delegates to computeSyncRatio when connected with non-zero highest', () => {
    expect(computeConnectedSyncRatio(50n, 100n, true)).toBe(Percent(0.5));
  });
  it('delegates to computeSyncRatio when connected with applied > 0 and highest = 0', () => {
    expect(computeConnectedSyncRatio(1000n, 0n, true)).toBe(Percent(0.5));
  });
  it('delegates to computeSyncRatio when not connected with non-zero values', () => {
    expect(computeConnectedSyncRatio(50n, 100n, false)).toBe(Percent(0.5));
  });
});
