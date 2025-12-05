import { StateSelector } from 'zustand';
import { WalletStore, LockSlice } from '../../stores';

export const lockWalletSelector: StateSelector<WalletStore, LockSlice> = ({
  isWalletLocked,
  setWalletLock,
  walletLock,
  resetWalletLock
}) => ({ isWalletLocked, setWalletLock, walletLock, resetWalletLock });
