import { getValueFromLocalStorage } from './local-storage';
import { WalletStorage } from '@src/types';

export const getWalletFromStorage = (): WalletStorage => {
  const stored = getValueFromLocalStorage('wallet');
  return !stored ? undefined : stored;
};
