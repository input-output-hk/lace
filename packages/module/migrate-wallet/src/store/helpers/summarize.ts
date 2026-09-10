import { BigNumber } from '@lace-lib/util';

import type { DiscoverySummary } from '../slice';
import type { Cardano } from '@cardano-sdk/core';
import type {
  CardanoRewardAccount,
  RequiredProtocolParameters,
  RewardAccountInfo,
} from '@lace-contract/cardano-context';

export const summarize = ({
  utxos,
  rewardInfos,
  estimatedFee,
  sweptAccountCount,
  scannedThroughAccountIndex,
  scriptUtxoCount,
  chunkCount,
  protocolParameters,
}: {
  utxos: Cardano.Utxo[];
  rewardInfos: (RewardAccountInfo & { rewardAccount: CardanoRewardAccount })[];
  estimatedFee: bigint;
  protocolParameters: Pick<RequiredProtocolParameters, 'stakeKeyDeposit'>;
  sweptAccountCount: number;
  scannedThroughAccountIndex: number;
  scriptUtxoCount: number;
  chunkCount: number;
}): DiscoverySummary => {
  let totalCoin = 0n;
  // One entry per asset, summed across every UTxO of every swept account: the
  // sweep moves all of it, so the total is what the review screen shows.
  const quantities = new Map<string, bigint>();
  for (const [, txOut] of utxos) {
    totalCoin += txOut.value.coins;
    for (const [assetId, quantity] of txOut.value.assets ?? []) {
      quantities.set(assetId, (quantities.get(assetId) ?? 0n) + quantity);
    }
  }
  const withdrawableRewards = rewardInfos.reduce(
    (sum, info) => sum + BigNumber.valueOf(info.withdrawableAmount),
    0n,
  );
  // Every registered stake key holds its own deposit, and multi-account sweeps
  // are first-class — a 3-account source with 3 registered keys retains three
  // deposits. Summed here, where both the count and the chain parameter are in
  // hand, rather than reduced to a boolean the screens then have to narrate
  // with a hardcoded figure.
  const retainedStakeDeposit = rewardInfos.reduce(
    (total, info) =>
      info.isRegistered
        ? total + BigInt(protocolParameters.stakeKeyDeposit)
        : total,
    0n,
  );

  return {
    utxoCount: utxos.length,
    totalCoin: totalCoin.toString(),
    // Sorted by id, so the review screen's list does not reshuffle with UTxO
    // order. Quantities are decimal strings for the same reason the lovelace
    // fields are: a bigint would not survive the redux round trip.
    assets: [...quantities]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([id, quantity]) => ({ id, quantity: quantity.toString() })),
    withdrawableRewards: withdrawableRewards.toString(),
    retainedStakeDeposit: retainedStakeDeposit.toString(),
    estimatedFee: estimatedFee.toString(),
    sweptAccountCount,
    scannedThroughAccountIndex,
    scriptUtxoCount,
    chunkCount,
  };
};
