/* eslint-disable no-magic-numbers */
import { of } from 'rxjs';
import { getWalletAccountsQtyString } from '../get-wallet-count-string';
import { AnyWallet, Bip32WalletAccount, WalletRepositoryApi } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';

const walletWithAccounts = { accounts: [{}, {}, {}] as Bip32WalletAccount<Wallet.AccountMetadata>[] } as AnyWallet<
  Wallet.WalletMetadata,
  Wallet.AccountMetadata
>;
const walletWithoutAccounts = { accounts: [] } as AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
const walletRepositoryWithWallets = {
  wallets$: of([walletWithAccounts, walletWithoutAccounts])
} as WalletRepositoryApi<Wallet.WalletMetadata, Wallet.AccountMetadata>;
const walletRepositoryWithEmptyArray = { wallets$: of([]) } as WalletRepositoryApi<
  Wallet.WalletMetadata,
  Wallet.AccountMetadata
>;

describe('getWalletAccountsQtyString', () => {
  it('should return comma-separated string of account quantities', async () => {
    const result = await getWalletAccountsQtyString(walletRepositoryWithWallets);
    expect(result).toBe('3,0');
  });

  it('should return an empty string when wallets$ emits wallets without accounts', async () => {
    const result = await getWalletAccountsQtyString(walletRepositoryWithEmptyArray);
    expect(result).toBe('');
  });

  it('should return an empty string when wallets$ emits an empty array', async () => {
    const result = await getWalletAccountsQtyString(walletRepositoryWithEmptyArray);
    expect(result).toBe('');
  });
});
