import { Wallet } from '@lace/cardano';
import { renderAmountInfo } from '@lace/core';
import { CurrencyInfo } from '../../outside-handles-provider';

export const AmountInfo = ({
  amount,
  cardanoCoin,
  fiatCurrency,
  cardanoFiatPrice,
  sign,
}: {
  amount: string;
  cardanoCoin: Wallet.CoinId;
  fiatCurrency: CurrencyInfo;
  cardanoFiatPrice: number;
  sign?: '+' | '-';
}) => (
  <div>
    {renderAmountInfo(
      [sign ? `${sign} ` : '', `${Wallet.util.lovelacesToAdaString(amount)} ${cardanoCoin.symbol}`].join(''),
      `${Wallet.util.convertAdaToFiat({
        ada: Wallet.util.lovelacesToAdaString(amount.toString()),
        fiat: cardanoFiatPrice,
      })} ${fiatCurrency?.symbol}`
    )}
  </div>
);
