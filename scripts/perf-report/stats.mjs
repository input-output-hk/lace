/**
 * Statistical helpers shared by the perf harnesses: median, bootstrap CI of
 * the difference of medians, and the pair verdict used by measure-startup's
 * adaptive sampling loop (harness-implementation-plan.md, phase 1).
 *
 * Design: non-parametric throughout (startup samples are skewed and can be
 * multi-modal — stragglers), medians instead of means, percentile bootstrap
 * instead of normal-theory intervals.
 */

export const median = values => {
  const sorted = [...values].filter(v => v != null).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Linear-interpolation quantile (q in [0,1]) — the percentile of record. */
export const quantile = (values, q) => {
  const sorted = [...values].filter(v => v != null).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

/**
 * Deterministic PRNG (mulberry32) seeded from a string. An unseeded bootstrap
 * makes boundary verdicts flip between re-renders of the same history — the
 * report seeds from its date so a night's verdict is reproducible, and tests
 * seed a constant so they can assert the exact verdict.
 */
export const seededRandom = seedString => {
  let h = 0x81_1c_9d_c5;
  for (let i = 0; i < seedString.length; i++) {
    h ^= seedString.charCodeAt(i);
    h = Math.imul(h, 0x01_00_01_93);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/**
 * Percentile-bootstrap 95% CI of median(a) − median(b).
 * Returns { diff, lo, hi }: diff is the observed difference of medians;
 * [lo, hi] the 2.5–97.5 percentile band of the resampled differences.
 * Pass `random` (e.g. seededRandom(date)) for reproducible intervals.
 */
export const bootstrapDiffCI = (
  a,
  b,
  { resamples = 5000, random = Math.random } = {},
) => {
  const resampleMedian = xs => {
    const out = new Array(xs.length);
    for (let i = 0; i < xs.length; i++) out[i] = xs[(random() * xs.length) | 0];
    return median(out);
  };
  const diffs = new Array(resamples);
  for (let i = 0; i < resamples; i++)
    diffs[i] = resampleMedian(a) - resampleMedian(b);
  diffs.sort((p, q) => p - q);
  return {
    diff: median(a) - median(b),
    lo: diffs[Math.floor(resamples * 0.025)],
    hi: diffs[Math.floor(resamples * 0.975)],
  };
};

/**
 * Sequential-sampling verdict for one variant-vs-baseline pair.
 *
 * a = samples of the variant under test, b = samples of the baseline;
 * diff > 0 means the variant is SLOWER than the baseline.
 *
 * Verdicts (tolAbs = tolerance × the smaller median — differences below it
 * are treated as not worth resolving):
 *   'equivalent'    — the whole CI fits inside ±tolAbs: any real difference
 *                     is smaller than the tolerance.
 *   'resolved'      — a real, bounded difference: the CI excludes 0 (the
 *                     direction is known) AND is narrow — ≤ 2×tolAbs, or
 *                     ≤ 25% of |diff| (a usable magnitude). A narrow CI that
 *                     straddles 0 is NOT resolved: "precisely can't tell the
 *                     sign" stays inconclusive.
 *   'inconclusive'  — not enough samples to say; keep sampling (or report
 *                     honestly if the budget ran out).
 */
export const judgePair = ({
  a,
  b,
  tolerance = 0.03,
  resamples = 5000,
  random = Math.random,
}) => {
  const base = {
    samplesA: a.length,
    samplesB: b.length,
    medianA: median(a),
    medianB: median(b),
  };
  if (a.length < 3 || b.length < 3)
    return { ...base, verdict: 'inconclusive', reason: 'fewer than 3 samples' };

  const { diff, lo, hi } = bootstrapDiffCI(a, b, { resamples, random });
  const tolAbs =
    tolerance * Math.min(Math.abs(base.medianA), Math.abs(base.medianB));
  const width = hi - lo;

  let verdict = 'inconclusive';
  if (lo >= -tolAbs && hi <= tolAbs) verdict = 'equivalent';
  else if (
    (lo > 0 || hi < 0) &&
    (width <= 2 * tolAbs || width <= 0.25 * Math.abs(diff))
  )
    verdict = 'resolved';

  return { ...base, diff, ciLo: lo, ciHi: hi, widthMs: width, tolAbs, verdict };
};
