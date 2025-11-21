import { Wallet } from '@lace/cardano';
import { Bip32WalletAccount } from '@cardano-sdk/web-extension';
import i18n from 'i18next';

export const getActiveWalletSubtitle = (account?: Bip32WalletAccount<Wallet.AccountMetadata>): string =>
  // LW-9574 update to appropriate/non-hardcoded subtitle for shared wallets
  account ? account.metadata.name : i18n.t('sharedWallets.userInfo.label');
