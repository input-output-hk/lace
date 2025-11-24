import { InitializeTxPropsValidationResult } from '@cardano-sdk/tx-construction';
import BigNumber from 'bignumber.js';

export interface TxMinimumCoinQuantity {
  coinMissing: string;
  minimumCoin: string;
}

export const getTotalMinimumCoins = (
  minCoins: InitializeTxPropsValidationResult['minimumCoinQuantities']
): TxMinimumCoinQuantity => {
  if (!minCoins) return { coinMissing: '0', minimumCoin: '0' };
  let coinMissing = new BigNumber(0);
  let minimumCoin = new BigNumber(0);

  // For non-advanced txs should only have one output.
  for (const [, coinQty] of minCoins) {
    coinMissing = coinMissing.plus(coinQty.coinMissing.toString());
    minimumCoin = minimumCoin.plus(coinQty.minimumCoin.toString());
  }
  return {
    coinMissing: coinMissing.toString(),
    minimumCoin: minimumCoin.toString()
  };
};
