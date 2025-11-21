import { AnyWallet, Blockchain } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';

type AnyWalletWithBlockchainName = AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata> & {
  blockchainName: string;
};

const hasBlockchainName = (
  wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
): wallet is AnyWalletWithBlockchainName => typeof (wallet as Record<string, unknown>)?.blockchainName === 'string';

export const getWalletBlockchain = (wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>): Blockchain =>
  hasBlockchainName(wallet) ? (wallet.blockchainName as Blockchain) : 'Cardano';
