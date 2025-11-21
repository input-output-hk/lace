import { Wallet } from '@lace/cardano';
import { getTxDirection, inspectTxType } from '@src/utils/tx-inspection';
import { txTransformer, TxTransformerInput } from './common-tx-transformer';
import type { TransformedTransactionActivity } from './types';

interface TxHistoryTransformerInput extends Omit<TxTransformerInput, 'tx'> {
  tx: Wallet.Cardano.HydratedTx;
  isSharedWallet?: boolean;
}

export const txHistoryTransformer = async ({
  tx,
  walletAddresses,
  fiatCurrency,
  fiatPrice,
  date,
  protocolParameters,
  cardanoCoin,
  resolveInput,
  isSharedWallet
}: TxHistoryTransformerInput): Promise<TransformedTransactionActivity[]> => {
  const type = await inspectTxType({ walletAddresses, tx, inputResolver: { resolveInput } });
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
    direction,
    resolveInput,
    isSharedWallet
  });
};
