import { NEVER } from 'rxjs';

import type { RealFiProvider } from '@lace-contract/realfi-staking';

/**
 * Stub RealFi provider for Storybook (ADR-27): the real `realfi-cardano`
 * module keeps its pages/addons/side-effects, but its provider dependency is
 * replaced with this — otherwise `makeStakingYieldPrime` fires a live
 * `api.preview.realfi.co` read at boot, making the regression net depend on
 * an external service's uptime AND able to overwrite story-seeded figures
 * (e.g. the persisted $1.02 vault rate) mid-test.
 *
 * Every method returns NEVER: the consuming side-effects stay pending, so the
 * story-seeded persisted state (yield info, activities, withdrawables) is the
 * single source of truth and stories drive flow transitions explicitly via
 * actions — an `of(Ok(...))` here would race those seeds (see the SteelSwap
 * stub for the precedent).
 */
export const stubRealFiProvider: RealFiProvider = {
  getSorQuote: () => NEVER,
  buildBundledTx: () => NEVER,
  buildCancelTx: () => NEVER,
  claimOrderAttribution: () => NEVER,
  getExchangeRateAndApy: () => NEVER,
  getStakeInputAssets: () => NEVER,
  getCooldownUnlockTime: () => NEVER,
  getStakeActivities: () => NEVER,
  getRPoints: () => NEVER,
  getWithdrawableUnstakes: () => NEVER,
  getCoolingDownUnstakes: () => NEVER,
  buildWithdrawTx: () => NEVER,
};
