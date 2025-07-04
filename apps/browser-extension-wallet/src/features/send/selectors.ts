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
  setDestinationAddress,
  setTransactionValue,
  setTransaction,
  setTransactionFeeLovelace
}) => ({
  destinationAddress,
  transactionValue,
  transaction,
  transactionFeeLovelace,
  setDestinationAddress,
  setTransactionValue,
  setTransaction,
  setTransactionFeeLovelace
});
