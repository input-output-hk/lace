/**
 * Diffusion-aware sUSDr↔USDr exchange rate from the partner SDK — replaces
 * the deprecated `latestVaultRatio` feed for `min_received` floors and quoted
 * outputs. On v1_1 deposited yield diffuses linearly into the rate, so the
 * correct rate is over *settled* backing; `calculateSusdrExchangeRate` is the
 * SDK's verbatim port of the on-chain math (`utilities.ak`), fed by the
 * `susdrExchangeRateInputs` partner read.
 *
 * SW-only: importing the SDK root pulls Blaze/Sundae into the bundle, so page
 * code must not import this file — the page-safe mirror of the same
 * interpolation lives in realfi-yield.ts.
 */
import { realfiDebugLog } from '@lace-contract/realfi-staking';
import {
  RealfiApi,
  calculateSusdrExchangeRate,
} from '@realfi-co/realfi-partner-sdk';

import type { RealFiNetworkConfig } from './realfi-config';

/**
 * The current USDr-per-sUSDr rate scaled by 1e6 — the scale the vault-rate
 * math in realfi-vault-rate.ts takes. `undefined` on any read failure, so
 * callers fail visibly instead of guessing a floor.
 */
export const fetchVaultRatioScaled = async (
  realfiNetwork: RealFiNetworkConfig['realfiNetwork'],
): Promise<bigint | undefined> => {
  try {
    const inputs = await RealfiApi.forNetwork(
      realfiNetwork,
    ).getSusdrExchangeRateInputs();
    const ratio = calculateSusdrExchangeRate(inputs, BigInt(Date.now()));
    return ratio > 0n ? ratio : undefined;
  } catch (error) {
    realfiDebugLog('susdrExchangeRateInputs read failed', { error });
    return undefined;
  }
};
