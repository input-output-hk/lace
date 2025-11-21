import { StateCreator } from 'zustand';
import { SendTransactionSlice } from '../types';

export const sendTransactionSlice: StateCreator<SendTransactionSlice> = (set) => ({
  transactionFeeLovelace: '0',
  destinationAddress: undefined,
  transactionValue: undefined,
  transaction: undefined,
  setDestinationAddress: (address) => set(() => ({ destinationAddress: address })),
  setTransactionValue: (value) => set(() => ({ transactionValue: value })),
  setTransaction: (tx) => set(() => ({ transaction: tx })),
  setTransactionFeeLovelace: (fee) => set(() => ({ transactionFeeLovelace: fee }))
});
