import { Wallet } from '@lace/cardano';
import dayjs from 'dayjs';
import { formatDate } from '@src/utils/format-date';
import { getTxDirection, inspectTxType } from '@src/utils/tx-inspection';
import { txTransformer, TxTransformerInput } from './common-tx-transformer';
import type { TransformedTx } from './types';

interface TxHistoryTransformerInput extends Omit<TxTransformerInput, 'tx'> {
  tx: Wallet.Cardano.HydratedTx;
}

export const txHistoryTransformer = ({
  tx,
  walletAddresses,
  fiatCurrency,
  fiatPrice,
  time,
  protocolParameters,
  cardanoCoin
}: TxHistoryTransformerInput): TransformedTx[] => {
  const type = inspectTxType({ walletAddresses, tx });
  const direction = getTxDirection({ type });

  return txTransformer({
    tx,
    walletAddresses,
    fiatCurrency,
    fiatPrice,
    time,
    protocolParameters,
    cardanoCoin,
    status: Wallet.TransactionStatus.SUCCESS,
    direction,
    date: dayjs().isSame(time, 'day') ? 'Today' : formatDate({ date: time, format: 'DD MMMM YYYY', type: 'local' })
  });
};
