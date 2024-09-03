import { filter, switchMap, withLatestFrom, zip } from 'rxjs';
import { Wallet } from '@lace/cardano';
import { WalletManager, WalletRepository } from '@cardano-sdk/web-extension';

export const cacheActivatedWalletAddressSubscription = (
  walletManager: WalletManager<Wallet.WalletMetadata, Wallet.AccountMetadata>,
  walletRepository: WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>
): void => {
  zip([
    walletManager.activeWalletId$.pipe(filter((activeWalletId) => Boolean(activeWalletId))),
    walletManager.activeWallet$.pipe(
      filter((wallet) => Boolean(wallet)),
      switchMap((wallet) => wallet.addresses$)
    )
  ])
    .pipe(withLatestFrom(walletRepository.wallets$))
    .subscribe(([[activeWallet, walletAddresses], wallets]) => {
      const wallet = wallets.find(({ walletId }) => walletId === activeWallet.walletId);
      const uniqueAddresses = [
        ...new Set([...(wallet.metadata.walletAddresses || []), ...walletAddresses.map(({ address }) => address)])
      ];

      walletRepository.updateWalletMetadata({
        walletId: activeWallet.walletId,
        metadata: {
          ...wallet.metadata,
          walletAddresses: uniqueAddresses
        }
      });
    });
};
