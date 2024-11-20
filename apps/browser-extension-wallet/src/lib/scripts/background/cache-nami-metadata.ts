import { combineLatest, debounceTime, filter, of, switchMap } from 'rxjs';
import merge from 'lodash/merge';
import { Wallet } from '@lace/cardano';
// eslint does not support exports property in package.json yet
// eslint-disable-next-line import/no-unresolved
import { getBalance as getBalanceFn } from '@lace/nami/adapters';
import { WalletManager, WalletRepository } from '@cardano-sdk/web-extension';
import { blockingWithLatestFrom } from '@cardano-sdk/util-rxjs';
import { isNotNil } from '@cardano-sdk/util';
import { getChainName } from '@src/utils/get-chain-name';

const DEBOUNCE_TIME_MS = 50;

export const cacheNamiMetadataSubscription = ({
  getBalance = getBalanceFn,
  walletManager,
  walletRepository
}: {
  getBalance?: typeof getBalanceFn;
  walletManager: WalletManager<Wallet.WalletMetadata, Wallet.AccountMetadata>;
  walletRepository: WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>;
}): void => {
  walletManager.activeWallet$
    .pipe(
      filter(isNotNil),
      switchMap(
        (wallet) =>
          combineLatest([
            of(wallet.props.chainId),
            of(wallet.props.walletId),
            of(wallet.props.accountIndex),
            wallet.observableWallet.addresses$,
            wallet.observableWallet.balance.utxo.total$,
            wallet.observableWallet.balance.utxo.unspendable$,
            wallet.observableWallet.balance.rewardAccounts.rewards$,
            wallet.observableWallet.protocolParameters$
          ]).pipe(debounceTime(DEBOUNCE_TIME_MS)) // Debounce to avoid multiple triggers when two or more observables emit at the same time (I.E addresses and utxo.total$)
      ),
      blockingWithLatestFrom(walletRepository.wallets$)
    )
    .subscribe(
      ([
        [chainId, activeWalletId, activeWalletAccountIndex, addresses, total, unspendable, rewards, protocolParameters],
        wallets
      ]) => {
        const address = addresses[0].address;
        const wallet = wallets.find(({ walletId }) => walletId === activeWalletId);

        if (!('accounts' in wallet)) {
          return;
        }
        const account = wallet.accounts.find(({ accountIndex }) => accountIndex === activeWalletAccountIndex);
        if (!account) {
          return;
        }

        const { metadata } = account;
        const hasAvatar = Boolean(metadata.namiMode?.avatar);
        const balance = getBalance({
          address: wallet.metadata?.walletAddresses?.[0] || addresses[0].address,
          total,
          unspendable,
          rewards,
          protocolParameters
        });
        const avatar = Math.random().toString();

        const chainName = getChainName(chainId);
        const updatedMetadata = merge(
          { ...metadata },
          {
            namiMode: {
              ...(!hasAvatar && { avatar }),
              address: { [chainName]: address },
              balance: { [chainName]: (balance.totalCoins - balance.lockedCoins - balance.unspendableCoins).toString() }
            }
          }
        );

        walletRepository.updateAccountMetadata({
          walletId: activeWalletId,
          accountIndex: activeWalletAccountIndex,
          metadata: updatedMetadata
        });
      }
    );
};
