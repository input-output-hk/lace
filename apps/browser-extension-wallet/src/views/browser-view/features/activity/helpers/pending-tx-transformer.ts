import { TxTransformerInput, txTransformer } from './common-tx-transformer';
import { Wallet } from '@lace/cardano';
import type { TransformedActivity } from './types';
import { TxDirections } from '@types';
import { ActivityType } from '@lace/core';

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
}: TxHistoryTransformerInput): (TransformedActivity & { type: TransactionActivityType })[] =>
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
