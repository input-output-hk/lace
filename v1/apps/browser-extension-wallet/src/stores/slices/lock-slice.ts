import { WalletLocked } from '@src/types';
import {
  deleteFromLocalStorage,
  getValueFromLocalStorage,
  bufferReviver,
  saveValueInLocalStorage
} from '@src/utils/local-storage';
import { LockSlice, SliceCreator, WalletInfoSlice, ZustandHandlers } from '../types';

const isWalletLocked = ({ get }: ZustandHandlers<LockSlice & WalletInfoSlice>): boolean => !!get().walletLock;

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

export const lockSlice: SliceCreator<LockSlice & WalletInfoSlice, LockSlice, void, LockSlice> = ({ get, set }) => {
  const walletLock = getValueFromLocalStorage('lock', undefined, bufferReviver);
  return {
    isWalletLocked: () => isWalletLocked({ get }),
    setWalletLock: (lock: WalletLocked) => setWalletLock(lock, { set }),
    walletLock,
    resetWalletLock: () => resetWalletLock(undefined, { set })
  };
};
