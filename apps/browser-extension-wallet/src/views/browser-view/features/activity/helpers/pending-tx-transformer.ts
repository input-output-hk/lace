import { TxTransformerInput, txTransformer } from './common-tx-transformer';
import { Wallet } from '@lace/cardano';
import type { TransformedTx } from './types';
import { TxDirections } from '@types';

interface TxHistoryTransformerInput extends Omit<TxTransformerInput, 'tx'> {
  tx: Wallet.TxInFlight;
}

export const pendingTxTransformer = ({
  tx,
  walletAddresses,
  fiatCurrency,
  fiatPrice,
  protocolParameters,
  cardanoCoin,
  date
}: TxHistoryTransformerInput): TransformedTx[] =>
  txTransformer({
    tx,
    walletAddresses,
    fiatCurrency,
    fiatPrice,
    protocolParameters,
    cardanoCoin,
    date,
    status: Wallet.TransactionStatus.PENDING,
    direction: TxDirections.Outgoing
  });
