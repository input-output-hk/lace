// The build channel the checks run against (ADR 66), set the same way as for
// tsdown and the declaration rollup.
export const CHANNEL = process.env.SDK_CHANNEL ?? 'stable';
if (CHANNEL !== 'stable' && CHANNEL !== 'canary') {
  throw new Error(`SDK_CHANNEL must be stable or canary, not ${CHANNEL}`);
}
