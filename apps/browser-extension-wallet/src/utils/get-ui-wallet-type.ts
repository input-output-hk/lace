import { WalletType } from '@cardano-sdk/web-extension';
import { ProfileDropdown } from '@lace/ui';

export const getUiWalletType = (walletType: WalletType): ProfileDropdown.WalletType => {
  if (walletType === WalletType.Script) return 'shared';
  return walletType === WalletType.InMemory ? 'hot' : 'cold';
};
