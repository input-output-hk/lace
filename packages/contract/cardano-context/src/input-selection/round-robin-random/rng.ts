const MASK_64 = (1n << 64n) - 1n;

/** The SplitMix64 additive constant (the golden ratio scaled to 64 bits). */
const GOLDEN_GAMMA = 0x9e_37_79_b9_7f_4a_7c_15n;
const MIX_MULTIPLIER_1 = 0xbf_58_47_6d_1c_e4_e5_b9n;
const MIX_MULTIPLIER_2 = 0x94_d0_49_bb_13_31_11_ebn;

const UINT32_RANGE = 0x1_00_00_00_00;

/**
 * SplitMix64 pseudo-random number generator over 64-bit unsigned integers
 * ("Fast Splittable Pseudorandom Number Generators", Steele, Lea and Flood,
 * OOPSLA 2014; constants from Sebastiano Vigna's public domain reference
 * implementation).
 *
 * Its single 64-bit word of state makes it trivial to re-seed
 * deterministically on every selection, which keeps repeated invocations from
 * the transaction balancing loop reproducible.
 *
 * NOT cryptographically secure: only for input selection randomization, never
 * for key material or any security sensitive purpose.
 */
export class SplitMix64 {
  private state: bigint;

  public constructor(seed: bigint) {
    this.state = seed & MASK_64;
  }

  /**
   * Advances the generator and returns the next pseudo-random 64-bit number.
   *
   * @returns The next number in the sequence, in `[0, 2^64)`.
   */
  public next(): bigint {
    this.state = (this.state + GOLDEN_GAMMA) & MASK_64;
    let mixed = this.state;
    mixed = ((mixed ^ (mixed >> 30n)) * MIX_MULTIPLIER_1) & MASK_64;
    mixed = ((mixed ^ (mixed >> 27n)) * MIX_MULTIPLIER_2) & MASK_64;
    return mixed ^ (mixed >> 31n);
  }

  /**
   * Returns a pseudo-random index in `[0, bound)`.
   *
   * Derived by modulo reduction, which introduces a negligible bias for the
   * small bounds used during input selection (bounded by the number of UTxOs
   * in a wallet).
   *
   * @param bound - The exclusive upper bound. Must be greater than zero.
   * @returns A pseudo-random index in `[0, bound)`.
   */
  public below(bound: number): number {
    return Number(this.next() % BigInt(bound));
  }
}

/**
 * Derives a 64-bit seed from platform entropy: the Web Crypto API when
 * available (web and React Native with a crypto polyfill), otherwise a
 * composition of `Math.random` samples.
 *
 * @returns A seed in `[0, 2^64)`.
 */
export const entropySeed = (): bigint => {
  const crypto = globalThis.crypto;
  if (typeof crypto?.getRandomValues === 'function') {
    const words = crypto.getRandomValues(new Uint32Array(2));
    return (BigInt(words[0]) << 32n) | BigInt(words[1]);
  }
  const high = BigInt(Math.floor(Math.random() * UINT32_RANGE));
  const low = BigInt(Math.floor(Math.random() * UINT32_RANGE));
  return (high << 32n) | low;
};
