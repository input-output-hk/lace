import { AnyWallet, WalletManager, WalletManagerActivateProps, WalletRepository } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import merge from 'lodash/merge';
import { filter, switchMap, withLatestFrom, zip } from 'rxjs';

const cacheActiveAccountMetadata = ({
  address,
  activeWallet,
  wallet,
  walletRepository
}: {
  address: string;
  activeWallet: WalletManagerActivateProps<string, unknown>;
  wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  walletRepository: WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>;
}) => {
  if (!('accounts' in wallet)) {
    return;
  }
  const account = wallet.accounts.find(({ accountIndex }) => accountIndex === activeWallet.accountIndex);
  if (!account) {
    return;
  }
  const { metadata } = account;
  const hasAvatar = Boolean(metadata.namiMode?.avatar);
  const hasAddress = Boolean(metadata.namiMode?.address);

  if (hasAvatar && hasAddress) {
    return;
  }

  const avatar = Math.random().toString();
  const updatedMetadata = merge(
    { ...metadata },
    {
      namiMode: {
        ...(hasAvatar ? {} : { avatar }),
        ...(hasAddress ? {} : { address })
      }
    }
  );

  walletRepository.updateAccountMetadata({
    walletId: activeWallet.walletId,
    accountIndex: activeWallet.accountIndex,
    metadata: updatedMetadata
  });
};

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

      cacheActiveAccountMetadata({
        activeWallet,
        wallet,
        walletRepository,
        address: walletAddresses[0].address.toString()
      });
    });
};
