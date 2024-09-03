import { filter, switchMap, zip } from 'rxjs';
import merge from 'lodash/merge';
import { Wallet } from '@lace/cardano';
// eslint does not support exports property in package.json yet
// eslint-disable-next-line import/no-unresolved
import { getBalance as getBalanceFn } from '@lace/nami/adapters';
import { WalletManager, WalletRepository } from '@cardano-sdk/web-extension';
import { blockingWithLatestFrom } from '@cardano-sdk/util-rxjs';

export const cacheNamiMetadataSubscription = ({
  getBalance = getBalanceFn,
  walletManager,
  walletRepository
}: {
  getBalance?: typeof getBalanceFn;
  walletManager: WalletManager<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  walletRepository: WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>;
}): void => {
  zip([
    walletManager.activeWalletId$.pipe(filter((activeWalletId) => Boolean(activeWalletId))),
    walletManager.activeWallet$.pipe(
      filter((wallet) => Boolean(wallet)),
      switchMap((wallet) =>
        zip([
          wallet.addresses$,
          wallet.balance.utxo.total$,
          wallet.balance.utxo.unspendable$,
          wallet.balance.rewardAccounts.rewards$,
          wallet.protocolParameters$
        ])
      )
    )
  ])
    .pipe(blockingWithLatestFrom(walletRepository.wallets$))
    .subscribe(([[activeWallet, [addresses, total, unspendable, rewards, protocolParameters]], wallets]) => {
      const address = addresses[0].address;
      const wallet = wallets.find(({ walletId }) => walletId === activeWallet.walletId);

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
      const balance = getBalance({
        address: wallet.metadata?.walletAddresses?.[0] || addresses[0].address,
        total,
        unspendable,
        rewards,
        protocolParameters
      });
      const avatar = Math.random().toString();

      const updatedMetadata = merge(
        { ...metadata },
        {
          namiMode: {
            ...(!hasAvatar && { avatar }),
            ...(!hasAddress && { address }),
            balance: (balance.totalCoins - balance.lockedCoins - balance.unspendableCoins).toString()
          }
        }
      );

      walletRepository.updateAccountMetadata({
        walletId: activeWallet.walletId,
        accountIndex: activeWallet.accountIndex,
        metadata: updatedMetadata
      });
    });
};
