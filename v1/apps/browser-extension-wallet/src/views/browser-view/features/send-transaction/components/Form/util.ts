import BigNumber from 'bignumber.js';
import { CurrencyInfo, Tokens } from '@src/types';
import { SpentBalances } from '../../types';
import { Wallet } from '@lace/cardano';

interface ResultFormatAdaAllocation {
  adaAmount: string;
  fiatAmount: string;
}

export const formatAdaAllocation = ({
  missingCoins,
  fiat = 0,
  cardanoCoin,
  fiatCurrency
}: {
  missingCoins: string;
  fiat: number;
  cardanoCoin: Wallet.CoinId;
  fiatCurrency: CurrencyInfo;
}): ResultFormatAdaAllocation => ({
  adaAmount: Wallet.util.getFormattedAmount({
    amount: missingCoins,
    cardanoCoin
  }),
  fiatAmount: `$${Wallet.util.convertLovelaceToFiat({
    lovelaces: missingCoins ?? '0',
    fiat
  })} ${fiatCurrency?.code}`
});

export const getNextBundleCoinId = (
  balance: string,
  assetBalances: Tokens,
  usedCoins: SpentBalances,
  info: Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>,
  cardanoCoin: Wallet.CoinId
): string => {
  const adaAmountInLovelace = usedCoins[cardanoCoin.id] ? usedCoins[cardanoCoin.id] : '0';
  const balanceInAda = Wallet.util.lovelacesToAdaString(balance);
  if (new BigNumber(adaAmountInLovelace).lt(balanceInAda)) return cardanoCoin.id;
  const filterdAssets = [];

  if (assetBalances?.size) {
    for (const [id, value] of assetBalances) {
      const coinAmount = usedCoins[id.toString()] || '0';
      const bigintAmount = Wallet.util.assetBalanceToBigInt(coinAmount, info.get(id));

      if (bigintAmount < value) filterdAssets.push(id.toString());
    }
  }

  return filterdAssets.length > 0 ? filterdAssets[0] : undefined;
};
