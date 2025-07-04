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
  setDestinationAddress: (address: CardanoTxOutAddress) => void;
  setTransactionValue: (value: CardanoTxOutValue) => void;
  setTransaction: (tx: CardanoTxBuild) => void;
  setTransactionFeeLovelace: (fee: string) => void;
}

export type SendStore = SendTransactionSlice & SendCancelModalSlice;
