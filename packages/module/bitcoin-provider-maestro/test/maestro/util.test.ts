import { describe, expect, it } from 'vitest';

import { btcStringToSatoshis, getOpReturnData } from '../../src/maestro';

import type { MaestroVout } from '../../src/maestro';

const SATS = 100_000_000;

const script = (asm: string | undefined, type?: string): MaestroVout =>
  ({
    scriptPubKey: asm ? { asm, type } : undefined,
  } as unknown as MaestroVout);

describe('utils', () => {
  describe('btcStringToSatoshis', () => {
    it.each([
      ['0', 0],
      ['1', SATS],
      ['0.5', 50_000_000],
      ['0.00000001', 1],
      ['1.00000000', SATS],
      ['1.23000000', 123_000_000],
      ['0003.1', 3 * SATS + 10_000_000],
      ['0.00012345', 12_345],
      ['0.0001234567', 12_345],
      ['12345678.87654321', 1_234_567_887_654_321],
    ])('converts "%s" → %i', (input, expected) => {
      expect(btcStringToSatoshis(input)).toBe(expected);
    });
  });

  describe('getOpReturnData', () => {
    it('returns the OP_RETURN data for nulldata outputs', () => {
      expect(
        getOpReturnData(
          script(
            'OP_RETURN aa21a9ed2d18cabc5f4d190dd5c0056495ff7972b05e15ee3e753cc5f0b5a5935e72504a',
            'nulldata',
          ),
        ),
      ).toBe(
        'aa21a9ed2d18cabc5f4d190dd5c0056495ff7972b05e15ee3e753cc5f0b5a5935e72504a',
      );
      expect(getOpReturnData(script('OP_RETURN deadbeef', 'nulldata'))).toBe(
        'deadbeef',
      );
    });

    it('returns undefined for non-nulldata outputs', () => {
      expect(
        getOpReturnData(script('P2WPKH deadbeef', 'witness_script0_keyhash')),
      ).toBeUndefined();
      expect(
        getOpReturnData(script('something else', undefined)),
      ).toBeUndefined();
      expect(getOpReturnData(script('OP_RETURN'))).toBeUndefined();
    });
  });
});
