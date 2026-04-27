import { Cardano } from '@cardano-sdk/core';
import { describe, it, expect } from 'vitest';

import { resolveSlotNo } from '../../src/common/time';

describe('time utilities', () => {
  const UNIX_MS = 1_730_901_968 * 1000;

  it('can convert unix time to slot', () => {
    const m = resolveSlotNo(Cardano.NetworkMagics.Mainnet, UNIX_MS);
    const p = resolveSlotNo(Cardano.NetworkMagics.Preview, UNIX_MS);
    const r = resolveSlotNo(Cardano.NetworkMagics.Preprod, UNIX_MS);

    expect(m).toBe(139_335_677);
    expect(p).toBe(64_245_968);
    expect(r).toBe(75_218_768);
  });
});
