import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  entropySeed,
  SplitMix64,
} from '../../../src/input-selection/round-robin-random/rng';

const MASK_64 = (1n << 64n) - 1n;

describe('SplitMix64', () => {
  it('matches the reference output sequence for seed 0', () => {
    const rng = new SplitMix64(0n);
    expect(rng.next()).toBe(0xe2_20_a8_39_7b_1d_cd_afn);
    expect(rng.next()).toBe(0x6e_78_9e_6a_a1_b9_65_f4n);
    expect(rng.next()).toBe(0x06_c4_5d_18_80_09_45_4fn);
    expect(rng.next()).toBe(0xf8_8b_b8_a8_72_4c_81_ecn);
    expect(rng.next()).toBe(0x1b_39_89_6a_51_a8_74_9bn);
  });

  it('produces identical sequences for identical seeds', () => {
    const first = new SplitMix64(42n);
    const second = new SplitMix64(42n);
    for (let draw = 0; draw < 100; draw++) {
      expect(first.next()).toBe(second.next());
    }
  });

  it('masks seeds to 64 bits', () => {
    const wide = new SplitMix64((1n << 64n) + 7n);
    const narrow = new SplitMix64(7n);
    expect(wide.next()).toBe(narrow.next());
  });

  it('keeps every output within 64 bits', () => {
    const rng = new SplitMix64(1234n);
    for (let draw = 0; draw < 100; draw++) {
      const value = rng.next();
      expect(value >= 0n).toBe(true);
      expect(value & ~MASK_64).toBe(0n);
    }
  });

  describe('below', () => {
    it('stays within [0, bound)', () => {
      const rng = new SplitMix64(7n);
      for (let draw = 0; draw < 200; draw++) {
        const value = rng.below(13);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(13);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('always returns 0 for a bound of 1', () => {
      const rng = new SplitMix64(99n);
      for (let draw = 0; draw < 10; draw++) {
        expect(rng.below(1)).toBe(0);
      }
    });
  });
});

describe('entropySeed', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a 64-bit seed from the Web Crypto API', () => {
    const seed = entropySeed();
    expect(seed >= 0n).toBe(true);
    expect(seed & ~MASK_64).toBe(0n);
  });

  it('falls back to Math.random composition when crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    const seed = entropySeed();
    expect(seed >= 0n).toBe(true);
    expect(seed & ~MASK_64).toBe(0n);
  });

  it('produces distinct seeds across invocations', () => {
    const seeds = new Set(
      Array.from({ length: 10 }, () => entropySeed().toString()),
    );
    expect(seeds.size).toBeGreaterThan(1);
  });
});
