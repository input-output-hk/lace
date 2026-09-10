import { Percent } from '@cardano-sdk/util';

export const computeConnectedSyncRatio = (
  applied: bigint,
  highest: bigint,
  isConnected: boolean,
): Percent =>
  isConnected && applied === 0n && highest === 0n
    ? Percent(1)
    : computeSyncRatio(applied, highest);

export const computeSyncRatio = (applied: bigint, highest: bigint): Percent => {
  if (highest === 0n) {
    if (applied === 0n) return Percent(0);

    // Use a logarithmic-like curve to show progress when highest is unknown.
    // As applied increases, it approaches 0.99 but never reaches 1.0,
    // ensuring the sync doesn't complete prematurely.
    const ratio = 1 - 1 / (1 + Number(applied) / 1000);
    return Percent(Math.min(0.99, ratio));
  }
  return Percent(Math.min(1, Number(applied) / Number(highest)));
};
