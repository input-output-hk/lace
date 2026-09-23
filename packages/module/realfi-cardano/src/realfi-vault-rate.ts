/**
 * Pure sUSDr↔USDr vault-rate math over a 1e6-scaled USDr-per-sUSDr ratio —
 * fed by the diffusion-aware settled-backing reads (realfi-exchange-rate.ts
 * in the SW, realfi-yield.ts on pages). Quote display math only — all order
 * `min_received` floors are SDK-computed.
 */

/** RealFi vault ratio scale (USDr per sUSDr × 1e6). */
export const VAULT_RATIO_SCALE_BI = 1_000_000n;

/** sUSDr received for `usdrOut` USDr at the vault rate. */
export const susdrOutForUsdr = (usdrOut: bigint, ratioScaled: bigint): bigint =>
  ratioScaled > 0n ? (usdrOut * VAULT_RATIO_SCALE_BI) / ratioScaled : usdrOut;

/** USDr released for `susdrIn` sUSDr at the vault rate. */
export const usdrOutForSusdr = (susdrIn: bigint, ratioScaled: bigint): bigint =>
  ratioScaled > 0n ? (susdrIn * ratioScaled) / VAULT_RATIO_SCALE_BI : susdrIn;

/** Display-precision rates for the quote surfaces. */
export const vaultRateNumbers = (
  ratioScaled: bigint,
): { usdrPerSusdr: number; susdrPerUsdr: number } => {
  const usdrPerSusdr = Number(ratioScaled) / Number(VAULT_RATIO_SCALE_BI);
  return { usdrPerSusdr, susdrPerUsdr: 1 / usdrPerSusdr };
};
