import { Wallet } from '@lace/cardano';

import { useWalletManager } from '@hooks/useWalletManager';
import { useObservable } from '@lace/common';
import { useWalletStore } from '@stores';
import { AnyWallet } from '@cardano-sdk/web-extension';

export const useCurrentWallet = (): AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata> | undefined => {
  const { walletRepository } = useWalletManager();
  const { cardanoWallet } = useWalletStore();
  const wallets = useObservable(walletRepository.wallets$);

  const activeWalletId = cardanoWallet?.source?.wallet?.walletId;
  return wallets?.find(({ walletId }) => walletId === activeWalletId);
};
