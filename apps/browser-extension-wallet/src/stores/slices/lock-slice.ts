import { WalletLocked } from '@src/types';
import { saveValueInLocalStorage, deleteFromLocalStorage } from '@src/utils/local-storage';
import { LockSlice, SliceCreator, WalletInfoSlice, ZustandHandlers } from '../types';

const isWalletLocked = ({ get }: ZustandHandlers<LockSlice & WalletInfoSlice>): boolean =>
  !get().keyAgentData && !!get().walletLock;

/**
 * Saves wallet in browser storage and global store
 */
const setWalletLock = (lock: WalletLocked, { set }: ZustandHandlers<LockSlice>): void => {
  saveValueInLocalStorage({ key: 'lock', value: lock });
  set({ walletLock: lock });
};

/**
 * Removes wallet lock from browser storage and global store
 */
const resetWalletLock = (_: WalletLocked, { set }: ZustandHandlers<LockSlice>): void => {
  deleteFromLocalStorage('lock');
  set({ walletLock: undefined });
};

export const lockSlice: SliceCreator<LockSlice & WalletInfoSlice, LockSlice, WalletLocked, LockSlice> = (
  { get, set },
  walletLock
) => ({
  isWalletLocked: () => isWalletLocked({ get }),
  walletLock,
  setWalletLock: (lock: WalletLocked) => setWalletLock(lock, { set }),
  resetWalletLock: () => resetWalletLock(undefined, { set })
});
