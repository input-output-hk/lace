import { TxTransformerInput, txTransformer } from './common-tx-transformer';
import { Wallet } from '@lace/cardano';
import type { TransformedTransactionActivity } from './types';
import { TxDirections } from '@types';

interface TxHistoryTransformerInput extends Omit<TxTransformerInput, 'tx'> {
  tx: Wallet.TxInFlight | Wallet.KeyManagement.WitnessedTx;
  status?: Wallet.TransactionStatus;
  isSharedWallet?: boolean;
}

export const pendingTxTransformer = ({
  tx,
  walletAddresses,
  fiatCurrency,
  fiatPrice,
  protocolParameters,
  cardanoCoin,
  date,
  resolveInput,
  status = Wallet.TransactionStatus.PENDING,
  isSharedWallet
}: TxHistoryTransformerInput): Promise<TransformedTransactionActivity[]> =>
  txTransformer({
    tx,
    walletAddresses,
    fiatCurrency,
    fiatPrice,
    protocolParameters,
    cardanoCoin,
    date,
    status,
    direction: TxDirections.Outgoing,
    resolveInput,
    isSharedWallet
  });
