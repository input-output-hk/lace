import type { Cardano } from '@cardano-sdk/core';
import type { TokenTransferValue as SdkTokenTransferValue } from '@cardano-sdk/core';

export type TokenTransferValue = {
  /** Coins follow SDK tokenTransferInspector sign convention: negative = spending (from entries), positive = receiving (to entries). */
  coins: bigint;
  assets: Map<Cardano.AssetId, bigint>;
};

const toTokenTransferValue = (
  entry: SdkTokenTransferValue,
): TokenTransferValue => {
  const assets = new Map<Cardano.AssetId, bigint>();
  for (const [assetId, { amount }] of entry.assets) {
    assets.set(assetId, amount);
  }
  return { coins: entry.coins, assets };
};

/** Foreign addresses always represent value moving outside the wallet and are never collapsed into the wallet representative. */
export const computeNetFlows = (
  fromRaw: Map<Cardano.PaymentAddress, SdkTokenTransferValue>,
  toRaw: Map<Cardano.PaymentAddress, SdkTokenTransferValue>,
  ownAddresses: readonly Cardano.PaymentAddress[],
): {
  from: Map<Cardano.PaymentAddress, TokenTransferValue>;
  to: Map<Cardano.PaymentAddress, TokenTransferValue>;
} => {
  const ownSet = new Set(ownAddresses);
  const from = new Map<Cardano.PaymentAddress, TokenTransferValue>();
  const to = new Map<Cardano.PaymentAddress, TokenTransferValue>();

  for (const [address, entry] of fromRaw) {
    if (!ownSet.has(address)) from.set(address, toTokenTransferValue(entry));
  }
  for (const [address, entry] of toRaw) {
    if (!ownSet.has(address)) to.set(address, toTokenTransferValue(entry));
  }

  let walletNetCoins = 0n;
  const walletNetAssets = new Map<Cardano.AssetId, bigint>();
  let representative: Cardano.PaymentAddress | undefined;

  const accumulateOwn = (
    entries: Map<Cardano.PaymentAddress, SdkTokenTransferValue>,
  ) => {
    for (const [address, entry] of entries) {
      if (!ownSet.has(address)) continue;
      if (representative === undefined) representative = address;
      walletNetCoins += entry.coins;
      for (const [assetId, { amount }] of entry.assets) {
        walletNetAssets.set(
          assetId,
          (walletNetAssets.get(assetId) ?? 0n) + amount,
        );
      }
    }
  };
  accumulateOwn(fromRaw);
  accumulateOwn(toRaw);

  if (representative === undefined) return { from, to };

  const leavingAssets = new Map<Cardano.AssetId, bigint>();
  const incomingAssets = new Map<Cardano.AssetId, bigint>();
  for (const [assetId, net] of walletNetAssets) {
    if (net < 0n) leavingAssets.set(assetId, net);
    else if (net > 0n) incomingAssets.set(assetId, net);
  }

  if (walletNetCoins < 0n || leavingAssets.size > 0) {
    from.set(representative, {
      coins: walletNetCoins < 0n ? walletNetCoins : 0n,
      assets: leavingAssets,
    });
  }
  if (walletNetCoins > 0n || incomingAssets.size > 0) {
    to.set(representative, {
      coins: walletNetCoins > 0n ? walletNetCoins : 0n,
      assets: incomingAssets,
    });
  }

  return { from, to };
};
