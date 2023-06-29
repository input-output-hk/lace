import BigNumber from 'bignumber.js';
import { AssetActivityItemProps, TransactionType } from '@lace/core';
import { Wallet } from '@lace/cardano';
import { CurrencyInfo, TxDirections } from '@types';
import { inspectTxValues, inspectTxType } from '@src/utils/tx-inspection';
import capitalize from 'lodash/capitalize';
import { formatTime } from '@src/utils/format-date';

export interface TxTransformerInput {
  tx: Wallet.TxInFlight;
  walletAddresses: Wallet.KeyManagement.GroupedAddress[];
  fiatCurrency: CurrencyInfo;
  fiatPrice?: number;
  protocolParameters: Wallet.ProtocolParameters;
  cardanoCoin: Wallet.CoinId;
  time: Date;
  direction?: TxDirections;
  status?: Wallet.TransactionStatus;
  date?: string;
}

export const getFormattedAmount = ({ amount, cardanoCoin }: { amount: string; cardanoCoin: Wallet.CoinId }): string => {
  const adaStringAmount = Wallet.util.lovelacesToAdaString(amount);
  return `${adaStringAmount} ${cardanoCoin.symbol}`;
};

export const getFormattedFiatAmount = ({
  amount,
  fiatPrice,
  fiatCurrency
}: {
  amount: BigNumber;
  fiatPrice: number;
  fiatCurrency: CurrencyInfo;
}): string => {
  const fiatAmount = fiatPrice
    ? Wallet.util.lovelacesToAdaString(amount.times(new BigNumber(fiatPrice)).toString())
    : '';
  return fiatAmount ? `${fiatAmount} ${fiatCurrency.code}` : '-';
};

/**
  Simplifies the transaction object to be used in the activity list

  @param tx the transaction object
  @param walletAddresses the addresses of the wallet and the reward account
  @param fiatCurrency the fiat currency details
  @param fiatPrice the fiat price of ADA
  @param protocolParameters the protocol parameters
  @param cardanoCoin the ADA coin details
  @param time the time of the transaction
  @param direction the direction of the transaction
  @param status the status of the transaction
  @param date the date of the transaction
 */

export const txTransformer = ({
  tx,
  walletAddresses,
  fiatCurrency,
  fiatPrice,
  protocolParameters,
  cardanoCoin,
  time,
  date,
  direction,
  status
}: TxTransformerInput): Omit<AssetActivityItemProps, 'onClick'> => {
  const implicitCoin = Wallet.Cardano.util.computeImplicitCoin(protocolParameters, tx.body);
  const deposit = implicitCoin.deposit ? Wallet.util.lovelacesToAdaString(implicitCoin.deposit.toString()) : undefined;
  const { coins, assets } = inspectTxValues({
    addresses: walletAddresses,
    tx: tx as unknown as Wallet.Cardano.HydratedTx,
    direction
  });
  const outputAmount = new BigNumber(coins.toString());
  const timestamp = formatTime(time, 'HH:mm:ss A');

  const assetsEntries = assets
    ? [...assets.entries()]
        .map(([id, val]) => ({ id: id.toString(), val: val.toString() }))
        .sort((a, b) => Number(b.val) - Number(a.val))
    : [];

  return {
    id: tx.id.toString(),
    deposit,
    fee: Wallet.util.lovelacesToAdaString(tx.body.fee.toString()),
    status,
    amount: getFormattedAmount({ amount: outputAmount.toString(), cardanoCoin }),
    fiatAmount: getFormattedFiatAmount({ amount: outputAmount, fiatCurrency, fiatPrice }),
    assets: assetsEntries,
    assetsNumber: (assets?.size ?? 0) + 1,
    date,
    timestamp
  };
};

export const pendingTxTransformer = ({
  tx,
  walletAddresses,
  fiatCurrency,
  fiatPrice,
  protocolParameters,
  cardanoCoin,
  time
}: TxTransformerInput): Omit<AssetActivityItemProps, 'onClick'> => {
  const type = inspectTxType({ walletAddresses, tx: tx as unknown as Wallet.Cardano.HydratedTx });
  const transformedTx = txTransformer({
    tx,
    walletAddresses,
    fiatCurrency,
    fiatPrice,
    protocolParameters,
    cardanoCoin,
    time,
    status: Wallet.TransactionStatus.PENDING,
    direction: TxDirections.Outgoing,
    date: capitalize(Wallet.TransactionStatus.PENDING)
  });
  return {
    ...transformedTx,
    type: type as TransactionType
  };
};
