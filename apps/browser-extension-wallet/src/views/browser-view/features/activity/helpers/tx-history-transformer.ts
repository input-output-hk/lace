/* eslint-disable complexity */
/* eslint-disable no-magic-numbers */
import BigNumber from 'bignumber.js';
import { Wallet } from '@lace/cardano';
import { AssetActivityItemProps } from '@lace/core';
import dayjs from 'dayjs';
import { formatDate } from '@src/utils/format-date';
import { getTxDirection, inspectTxType } from '@src/utils/tx-inspection';
import {
  getFormattedAmount,
  getFormattedFiatAmount,
  txTransformer,
  TxTransformerInput
} from './pending-tx-transformer';
import { TxDirections } from '@types';

interface TxHistoryTransformerInput extends Omit<TxTransformerInput, 'tx'> {
  tx: Wallet.Cardano.HydratedTx;
}

/**
  calculates the amount of rewards withdrawn by the wallet

  @param withdrawals the withdrawal list in the transaction
  @param rewardAccount needed to verify if the withdrawal was made to the wallet stake address
*/
export const getRewardsAmount = (
  withdrawals: Wallet.Cardano.Withdrawal[],
  rewardAccounts: Wallet.Cardano.RewardAccount[]
): string =>
  withdrawals
    ?.reduce(
      (total, { quantity, stakeAddress }) =>
        rewardAccounts.includes(stakeAddress) ? total.plus(quantity.toString()) : total,
      new BigNumber(0)
    )
    ?.toString() || '0';

export const txHistoryTransformer = ({
  tx,
  walletAddresses,
  fiatCurrency,
  fiatPrice,
  time,
  protocolParameters,
  cardanoCoin
}: TxHistoryTransformerInput):
  | Array<Omit<AssetActivityItemProps, 'onClick'>>
  | Omit<AssetActivityItemProps, 'onClick'> => {
  const type = inspectTxType({ walletAddresses, tx });
  const direction = getTxDirection({ type });

  const transformedTx = txTransformer({
    tx: tx as unknown as Wallet.TxInFlight,
    walletAddresses,
    fiatCurrency,
    fiatPrice,
    time,
    protocolParameters,
    cardanoCoin,
    status: Wallet.TransactionStatus.SUCCESS,
    direction: direction as TxDirections,
    date: dayjs().isSame(time, 'day') ? 'Today' : formatDate(time, 'DD MMMM YYYY')
  });

  /*
    whenever the wallet have withdrawn rewards, we will need need to create a new record Rewards and add it to the transaction history list
    given this, we will keep the original send transaction type and we will add this new Rewards record
    */
  if (type === 'rewards' || type === 'self-rewards') {
    const rewardsAmount = getRewardsAmount(
      tx?.body?.withdrawals,
      walletAddresses.map((addr) => addr.rewardAccount)
    );
    // TODO: create a type for this and replace AssetActivityItemProps type in other place (JIRA: LW-5490)
    return [
      {
        ...transformedTx,
        type: type === 'self-rewards' ? 'self' : 'outgoing'
      },
      {
        type: 'rewards',
        direction: 'Incoming',
        amount: getFormattedAmount({ amount: rewardsAmount, cardanoCoin }),
        fiatAmount: getFormattedFiatAmount({
          amount: new BigNumber(tx?.body?.withdrawals[0]?.quantity?.toString() || '0'),
          fiatCurrency,
          fiatPrice
        }),
        status: Wallet.TransactionStatus.SPENDABLE,
        date: transformedTx.date,
        assets: [],
        timestamp: transformedTx.timestamp
      }
    ] as Array<Omit<AssetActivityItemProps, 'onClick'>>;
  }

  return {
    ...transformedTx,
    type,
    direction
  };
};
