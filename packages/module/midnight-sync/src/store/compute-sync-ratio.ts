import { Percent } from '@cardano-sdk/util';

export const computeSyncRatio = (
  applied: bigint,
  highest: bigint,
  isStrictlyComplete = false,
): Percent | undefined => {
  if (applied < 0n || highest < 0n) return undefined;
  if (highest === 0n) {
    // The SDK owns empty-history completion. Connection alone cannot establish
    // it, and an absolute cursor cannot estimate work against an unknown target.
    return applied === 0n && isStrictlyComplete ? Percent(1) : undefined;
  }
  return Percent(Math.min(1, Number(applied) / Number(highest)));
};
