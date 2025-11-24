import { WalletRepositoryApi } from '@cardano-sdk/web-extension';
import { firstValueFrom } from 'rxjs';
import { Wallet } from '@lace/cardano';

export const getWalletAccountsQtyString = async (
  walletRepository: WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>
): Promise<string> => {
  const wallets = await firstValueFrom(walletRepository.wallets$);
  return wallets
    .reduce((acc, wallet) => {
      if ('accounts' in wallet) {
        acc.push(wallet.accounts.length);
      }
      return acc;
    }, [])
    .join(',');
};
