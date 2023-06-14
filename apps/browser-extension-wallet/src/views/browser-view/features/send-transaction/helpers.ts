import { Wallet } from '@lace/cardano';
import { AssetInfo, CardanoOutput, OutputList, SpentBalances } from './types';
import BigNumber from 'bignumber.js';
import { CoinId } from '@src/types';

export const calculateSpentBalance = (outputs: OutputList): Record<string, string> => {
  let spentBalances: Record<string, string> = {};
  const values = Object.values(outputs);

  for (const { assets } of values) {
    for (const asset of assets) {
      const balance = spentBalances[asset.id] || '0';
      const sum = new BigNumber(balance.toString()).plus(asset?.value || '0');
      spentBalances = { ...spentBalances, [asset.id]: sum.isNaN() ? '0' : sum.toString() };
    }
  }

  return spentBalances;
};

export const getOutputValues = (assets: Array<AssetInfo>, cardanoCoin: CoinId): CardanoOutput['value'] => {
  const assetsMap = new Map();
  let coins = '0';

  for (const info of assets) {
    if (cardanoCoin.id === info.id) {
      coins = Wallet.util.adaToLovelacesString(info.value || '0');
    } else {
      try {
        if (info.value && Number(info.value) && !Number.isNaN(Number(info.value))) {
          assetsMap.set(Wallet.Cardano.AssetId(info.id), info.value);
        }
      } catch {
        // If asset is invalid don't set currentCoin
      }
    }
  }

  return {
    coins,
    assets: assetsMap.size === 0 ? undefined : assetsMap
  };
};

export const getReachedMaxAmountList = ({
  assets = new Map(),
  tokensUsed,
  spendableCoin,
  balance,
  exceed = false,
  cardanoCoin
}: {
  assets: Wallet.Assets;
  tokensUsed: SpentBalances;
  spendableCoin: bigint;
  balance: Wallet.Cardano.Value;
  exceed?: boolean;
  cardanoCoin: CoinId;
}): (string | Wallet.Cardano.AssetId)[] => {
  const reachedMaxAmountAda =
    tokensUsed[cardanoCoin.id] && spendableCoin
      ? new BigNumber(tokensUsed[cardanoCoin.id])[exceed ? 'gt' : 'gte'](
          Wallet.util.lovelacesToAdaString(spendableCoin.toString())
        )
      : false;

  const reachedMaxAmountAssets = balance?.assets?.size
    ? [...balance.assets]
        .filter(([id, value]) => {
          if (tokensUsed[id.toString()]) {
            const balanceInBigInt = Wallet.util.assetBalanceToBigInt(tokensUsed[id.toString()], assets.get(id));
            return exceed ? balanceInBigInt > value : balanceInBigInt >= value;
          }

          return false;
        })
        .map(([id]) => id)
    : [];

  return reachedMaxAmountAda ? [...reachedMaxAmountAssets, cardanoCoin.id] : reachedMaxAmountAssets;
};
