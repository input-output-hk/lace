import { Cardano } from '@cardano-sdk/core';
import { InitializeTxPropsValidationResult, InitializeTxProps } from '@cardano-sdk/tx-construction';
import BigNumber from 'bignumber.js';

export const setMissingCoins = (
  minimumCoinQuantities: InitializeTxPropsValidationResult['minimumCoinQuantities'],
  outputSet: Set<Cardano.TxOut>,
  options?: {
    minCoinToSend: number;
  }
): InitializeTxProps => {
  const MIN_COIN_TO_SEND = options?.minCoinToSend ?? 1;
  const outputsList: Cardano.TxOut[] = [...outputSet];
  const outputs: Cardano.TxOut[] = [];

  for (const txout of outputsList) {
    if (minimumCoinQuantities.has(txout)) {
      const minCoin = minimumCoinQuantities.get(txout);

      const sentCoins = minCoin?.coinMissing
        ? BigInt(new BigNumber(txout.value.coins.toString()).plus(minCoin?.coinMissing.toString()).toString())
        : txout.value.coins;

      outputs.push({ ...txout, value: { ...txout.value, coins: sentCoins } });
    } else {
      const sentCoins = new BigNumber(txout.value.coins.toString()).lte(MIN_COIN_TO_SEND)
        ? BigInt(MIN_COIN_TO_SEND)
        : txout.value.coins;

      outputs.push({ ...txout, value: { ...txout.value, coins: sentCoins } });
    }
  }

  return { outputs: new Set(outputs) };
};
