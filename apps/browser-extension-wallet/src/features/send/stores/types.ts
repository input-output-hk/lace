import { TxMinimumCoinQuantity } from '../../../types';
import { CardanoTxBuild, CardanoTxOutAddress, CardanoTxOutValue } from '../../../types/cardano';

export interface SendCancelModalSlice {
  showCancelSendModal: boolean;
  setShowCancelSendModal: (args: boolean) => void;
}

export interface SendTransactionSlice {
  destinationAddress: CardanoTxOutAddress;
  transactionValue: CardanoTxOutValue;
  transaction: CardanoTxBuild;
  transactionFeeLovelace: string;
  minimumCoinQuantity: TxMinimumCoinQuantity;
  setDestinationAddress: (address: CardanoTxOutAddress) => void;
  setTransactionValue: (value: CardanoTxOutValue) => void;
  setTransaction: (tx: CardanoTxBuild) => void;
  setTransactionFeeLovelace: (fee: string) => void;
  setMinimumCoinQuantity: (coinQty: TxMinimumCoinQuantity) => void;
}

export type SendStore = SendTransactionSlice & SendCancelModalSlice;
