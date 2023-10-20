import { Wallet } from '@lace/cardano';
import { getTxDirection, inspectTxType } from '@src/utils/tx-inspection';
import { txTransformer, TxTransformerInput } from './common-tx-transformer';
import type { TransformedTransactionActivity } from './types';

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
}: TxHistoryTransformerInput): TransformedTransactionActivity[] => {
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
