/**
 * A CMS-advertised annual reward rate: a single percentage, or a low–high
 * range. Values are plain numbers (percent) — the `%` is applied by the copy,
 * not stored — so `{ min: 2, max: 4 }` renders "2 – 4%".
 */
export type EarnRewardsRate =
  | { kind: 'range'; min: number; max: number }
  | { kind: 'single'; value: number };

/**
 * The un-normalized shape of a per-network rate as it arrives on the feature
 * flag: a bare number is the shorthand single value.
 */
export type EarnRewardsRateInput =
  | number
  | { min: number; max: number }
  | { value: number };

// Domain ceiling for an advertised percent-per-year rate. No legitimate
// staking claim exceeds 100%/yr — a larger value is almost certainly
// mis-entered basis points (e.g. 250 for 2.5%), so it hides the rate instead.
const MAX_RATE_PERCENT = 100;

const validRatePercent = (value: unknown): number | undefined =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value > 0 &&
  value <= MAX_RATE_PERCENT
    ? value
    : undefined;

/**
 * Normalize a raw rate entry into the display union. Accepts a bare number
 * (shorthand → single), `{ value }`, or `{ min, max }`; returns `undefined` for
 * anything partial, malformed, or outside the advertised-rate domain — each
 * number must be a finite percent in (0, 100], and a range needs `min ≤ max` —
 * so a broken payload hides the rate-led copy rather than rendering a nonsense
 * claim ("Earn -3%…", "Earn 5 – 2%…").
 */
export const parseEarnRewardsRate = (
  raw: unknown,
): EarnRewardsRate | undefined => {
  const bare = validRatePercent(raw);
  if (bare !== undefined) return { kind: 'single', value: bare };
  if (!raw || typeof raw !== 'object') return undefined;

  const { value, min, max } = raw as {
    value?: unknown;
    min?: unknown;
    max?: unknown;
  };
  const single = validRatePercent(value);
  if (single !== undefined) return { kind: 'single', value: single };

  const lo = validRatePercent(min);
  const hi = validRatePercent(max);
  if (lo !== undefined && hi !== undefined && lo <= hi)
    return { kind: 'range', min: lo, max: hi };

  return undefined;
};
