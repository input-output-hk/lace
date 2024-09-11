import { UpdateWalletMetadataProps, WalletManager, WalletRepository } from '@cardano-sdk/web-extension';
import { blockingWithLatestFrom } from '@cardano-sdk/util-rxjs';
import { Wallet } from '@lace/cardano';
import { EMPTY, filter, map, Observable, switchMap } from 'rxjs';
import { isNotNil } from '@cardano-sdk/util';
import uniq from 'lodash/uniq';

export const walletMetadataWithAddresses = (
  walletManager: WalletManager<Wallet.WalletMetadata, Wallet.AccountMetadata>,
  walletRepository: WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>
): Observable<UpdateWalletMetadataProps<Wallet.WalletMetadata>> =>
  walletManager.activeWallet$.pipe(
    switchMap((activeWallet) =>
      activeWallet
        ? activeWallet.observableWallet.addresses$.pipe(
            map((addresses) => addresses.map(({ address }) => address)),
            blockingWithLatestFrom(
              walletRepository.wallets$.pipe(
                map((wallets) => wallets.find(({ walletId }) => walletId === activeWallet.props.walletId)),
                filter(isNotNil)
              )
            ),
            map(([walletAddresses, walletEntity]) => ({
              walletId: activeWallet.props.walletId,
              metadata: {
                ...walletEntity.metadata,
                walletAddresses: uniq([...(walletEntity?.metadata?.walletAddresses || []), ...walletAddresses])
              }
            }))
          )
        : EMPTY
    )
  );

export const cacheActivatedWalletAddressSubscription = (
  walletManager: WalletManager<Wallet.WalletMetadata, Wallet.AccountMetadata>,
  walletRepository: WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>
): void => {
  walletMetadataWithAddresses(walletManager, walletRepository).subscribe((updateProps) =>
    walletRepository.updateWalletMetadata(updateProps)
  );
};
