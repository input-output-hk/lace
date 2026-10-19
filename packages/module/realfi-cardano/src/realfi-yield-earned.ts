import { Cardano } from '@cardano-sdk/core';
import { RealfiApi } from '@realfi-co/realfi-partner-sdk';

import type {
  RealFiNetworkConfig,
  RealFiYieldEarned,
} from '@lace-contract/realfi-staking';

/** Yield reads in flight at once for one account. */
const MAX_CONCURRENT_YIELD_READS = 4;

const paymentKeyHashOf = (addressBech32: string): string | undefined => {
  try {
    return Cardano.Address.fromBech32(addressBech32).getProps().paymentPart
      ?.hash;
  } catch {
    return undefined;
  }
};

/**
 * An account's lifetime sUSDr yield from RealFi's yield breakdown, via the
 * partner SDK's Blaze-free off-chain client (like the R-Points read). RealFi
 * keys the breakdown by payment credential and nets the sUSDr held under it
 * against its principal, so the figure covers stakes made before this install.
 * Holdings under different credentials are disjoint, so the account total is
 * the sum over its distinct payment credentials; addresses sharing a
 * credential (base and enterprise) are read once, or they would double-count.
 *
 * Resolves `undefined` when no address carries a payment credential. Throws if
 * any credential's read fails, so the caller keeps its last complete total
 * instead of storing a partial one.
 */
export const fetchYieldEarned = async (
  config: Pick<RealFiNetworkConfig, 'realfiNetwork'>,
  addressesBech32: readonly string[],
): Promise<RealFiYieldEarned | undefined> => {
  const addressByPaymentKey = new Map<string, string>();
  for (const address of addressesBech32) {
    const paymentKeyHash = paymentKeyHashOf(address);
    if (paymentKeyHash && !addressByPaymentKey.has(paymentKeyHash)) {
      addressByPaymentKey.set(paymentKeyHash, address);
    }
  }
  if (addressByPaymentKey.size === 0) return undefined;
  const api = RealfiApi.forNetwork(config.realfiNetwork);
  const representatives = [...addressByPaymentKey.values()];
  let total = 0n;
  for (
    let start = 0;
    start < representatives.length;
    start += MAX_CONCURRENT_YIELD_READS
  ) {
    const breakdowns = await Promise.all(
      representatives
        .slice(start, start + MAX_CONCURRENT_YIELD_READS)
        .map(async address => api.getYieldBreakdown(address)),
    );
    for (const breakdown of breakdowns) total += breakdown.yield;
  }
  return { yieldUsdrBaseUnits: String(total) };
};
