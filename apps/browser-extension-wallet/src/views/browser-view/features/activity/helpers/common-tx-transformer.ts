import BigNumber from 'bignumber.js';
import { Wallet } from '@lace/cardano';
import { CurrencyInfo, TxDirections } from '@types';
import { inspectTxValues, inspectTxType } from '@src/utils/tx-inspection';
import { formatDate, formatTime } from '@src/utils/format-date';
import type { TransformedTx } from './types';
import { TransactionStatus } from '@lace/core';
import capitalize from 'lodash/capitalize';
import dayjs from 'dayjs';

export interface TxTransformerInput {
  tx: Wallet.TxInFlight | Wallet.Cardano.HydratedTx;
  walletAddresses: Wallet.KeyManagement.GroupedAddress[];
  fiatCurrency: CurrencyInfo;
  fiatPrice?: number;
  protocolParameters: Wallet.ProtocolParameters;
  cardanoCoin: Wallet.CoinId;
  date: Date;
  direction?: TxDirections;
  status?: Wallet.TransactionStatus;
}

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

const splitDelegationTx = (tx: TransformedTx): TransformedTx[] => {
  if (tx.deposit) {
    return [
      {
        ...tx,
        type: 'delegation',
        // Deposit already shown in the delegationRegistration
        deposit: undefined
      },
      {
        ...tx,
        type: 'delegationRegistration',
        // Let registration show just the deposit,
        // and the other transaction show fee to avoid duplicity
        fee: '0'
      }
    ];
  } else if (tx.depositReclaim) {
    return [
      {
        ...tx,
        type: 'delegation',
        // Reclaimed deposit already shown in the delegationDeregistration
        depositReclaim: undefined
      },
      {
        ...tx,
        type: 'delegationDeregistration',
        // Let de-registration show just the returned deposit,
        // and the other transaction show fee to avoid duplicity
        fee: '0'
      }
    ];
  }

  return [];
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
  date,
  direction,
  status
}: TxTransformerInput): TransformedTx[] => {
  const implicitCoin = Wallet.Cardano.util.computeImplicitCoin(protocolParameters, tx.body);
  const deposit = implicitCoin.deposit ? Wallet.util.lovelacesToAdaString(implicitCoin.deposit.toString()) : undefined;
  const depositReclaimValue = Wallet.util.calculateDepositReclaim(implicitCoin);
  const depositReclaim = depositReclaimValue
    ? Wallet.util.lovelacesToAdaString(depositReclaimValue.toString())
    : undefined;
  const { coins, assets } = inspectTxValues({
    addresses: walletAddresses,
    tx: tx as unknown as Wallet.Cardano.HydratedTx,
    direction
  });
  const outputAmount = new BigNumber(coins.toString());
  const formattedDate = dayjs().isSame(date, 'day')
    ? 'Today'
    : formatDate({ date, format: 'DD MMMM YYYY', type: 'local' });
  const formattedTimestamp = formatTime({
    date,
    type: 'local'
  });

  const assetsEntries = assets
    ? [...assets.entries()]
        .map(([id, val]) => ({ id: id.toString(), val: val.toString() }))
        .sort((a, b) => Number(b.val) - Number(a.val))
    : [];

  const baseTransformedTx = {
    id: tx.id.toString(),
    deposit,
    depositReclaim,
    fee: Wallet.util.lovelacesToAdaString(tx.body.fee.toString()),
    status,
    amount: Wallet.util.getFormattedAmount({ amount: outputAmount.toString(), cardanoCoin }),
    fiatAmount: getFormattedFiatAmount({ amount: outputAmount, fiatCurrency, fiatPrice }),
    assets: assetsEntries,
    assetsNumber: (assets?.size ?? 0) + 1,
    date,
    formattedDate: status === TransactionStatus.PENDING ? capitalize(Wallet.TransactionStatus.PENDING) : formattedDate,
    formattedTimestamp
  };

  // Note that TxInFlight at type level does not expose its inputs with address,
  // which would prevent `inspectTxType` from determining whether tx is incoming or outgoing.
  // However at runtime, the "address" property is present (ATM) and the call below works.
  // SDK Ticket LW-8767 should fix the type of Input in TxInFlight to contain the address
  const type = inspectTxType({ walletAddresses, tx: tx as unknown as Wallet.Cardano.HydratedTx });

  if (type === 'delegation') {
    return splitDelegationTx(baseTransformedTx);
  }

  return [
    {
      ...baseTransformedTx,
      type,
      direction
    }
  ];
};
