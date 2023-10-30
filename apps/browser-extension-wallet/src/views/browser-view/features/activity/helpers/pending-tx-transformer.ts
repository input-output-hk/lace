import { TxTransformerInput, txTransformer } from './common-tx-transformer';
import { Wallet } from '@lace/cardano';
import type { TransformedTx } from './types';
import capitalize from 'lodash/capitalize';
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
  time
}: TxHistoryTransformerInput): TransformedTx[] =>
  txTransformer({
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
