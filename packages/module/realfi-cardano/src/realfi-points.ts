import { RealfiApi } from '@realfi-co/realfi-partner-sdk';

import type {
  RealFiNetworkConfig,
  RealFiRPoints,
} from '@lace-contract/realfi-staking';

/**
 * The wallet's R-Points snapshot (launch season, LW-15495) via the partner
 * SDK's Blaze-free off-chain client — the same client the other off-chain
 * reads use. The settled balance is preferred; RealFi's provisional figure
 * (`potentialPoints`) serves while the season hasn't finalised, and a wallet
 * the engine has no record of reads as 0 — a successful read, not a failure.
 * Lace never computes points itself: mid-season quest arithmetic is RealFi's
 * (its dapp derives it from a quest-counts read the partner SDK doesn't
 * expose), so until RealFi publishes a provisional total this can trail the
 * dapp's headline figure. Throws on transport failure — the provider rethrows
 * for the side-effect's retryBackoff, and exhausted retries keep the store's
 * previous snapshot.
 */
export const fetchRPoints = async (
  config: Pick<RealFiNetworkConfig, 'realfiNetwork'>,
  addressBech32: string,
): Promise<RealFiRPoints> => {
  const balance = await RealfiApi.forNetwork(
    config.realfiNetwork,
  ).getPointsBalance(addressBech32);
  return {
    totalPoints: balance.pointsBalance ?? balance.potentialPoints ?? 0,
  };
};
