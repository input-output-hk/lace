import { Wallet } from '@lace/cardano';
import { getTxDirection, inspectTxType } from '@src/utils/tx-inspection';
import { txTransformer, TxTransformerInput } from './common-tx-transformer';
import type { TransformedActivity } from './types';
import { ActivityType } from '@lace/core';

interface TxHistoryTransformerInput extends Omit<TxTransformerInput, 'tx'> {
  tx: Wallet.Cardano.HydratedTx;
}

export const txHistoryTransformer = ({
  tx,
  walletAddresses,
  fiatCurrency,
  fiatPrice,
  date,
  protocolParameters,
  cardanoCoin
}: TxHistoryTransformerInput): (TransformedActivity & { type: Exclude<ActivityType, 'rewards'> })[] => {
  const type = inspectTxType({ walletAddresses, tx });
  const direction = getTxDirection({ type });

  return txTransformer({
    tx,
    walletAddresses,
    fiatCurrency,
    fiatPrice,
    date,
    protocolParameters,
    cardanoCoin,
    status: Wallet.TransactionStatus.SUCCESS,
    direction
  });
};
