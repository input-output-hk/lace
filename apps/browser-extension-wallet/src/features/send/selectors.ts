import { StateSelector } from 'zustand';
import { SendStore, SendTransactionSlice, SendCancelModalSlice } from './stores';

export const cancelModalSelector: StateSelector<SendStore, SendCancelModalSlice> = (state) => ({
  showCancelSendModal: state.showCancelSendModal,
  setShowCancelSendModal: state.setShowCancelSendModal
});

export const sendTransactionSelector: StateSelector<SendStore, SendTransactionSlice> = ({
  destinationAddress,
  transactionValue,
  transaction,
  transactionFeeLovelace,
  minimumCoinQuantity,
  setDestinationAddress,
  setTransactionValue,
  setTransaction,
  setTransactionFeeLovelace,
  setMinimumCoinQuantity
}) => ({
  destinationAddress,
  transactionValue,
  transaction,
  transactionFeeLovelace,
  minimumCoinQuantity,
  setDestinationAddress,
  setTransactionValue,
  setTransaction,
  setTransactionFeeLovelace,
  setMinimumCoinQuantity
});
