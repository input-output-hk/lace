import { StateCreator } from 'zustand';
import { SendCancelModalSlice } from '../types';

export const sendCancelModalSlice: StateCreator<SendCancelModalSlice> = (set) => ({
  showCancelSendModal: false,
  setShowCancelSendModal: (value) => set(() => ({ showCancelSendModal: value }))
});
