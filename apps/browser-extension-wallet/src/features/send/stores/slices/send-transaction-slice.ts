import { StateCreator } from 'zustand';
import { SendTransactionSlice } from '../types';

export const sendTransactionSlice: StateCreator<SendTransactionSlice> = (set) => ({
  transactionFeeLovelace: '0',
  destinationAddress: undefined,
  transactionValue: undefined,
  transaction: undefined,
  minimumCoinQuantity: { coinMissing: '0', minimumCoin: '0' },
  setDestinationAddress: (address) => set(() => ({ destinationAddress: address })),
  setTransactionValue: (value) => set(() => ({ transactionValue: value })),
  setTransaction: (tx) => set(() => ({ transaction: tx })),
  setTransactionFeeLovelace: (fee) => set(() => ({ transactionFeeLovelace: fee })),
  setMinimumCoinQuantity: (coinQty) => set(() => ({ minimumCoinQuantity: coinQty }))
});
