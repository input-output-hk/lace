import { AnyWallet } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import flatMap from 'lodash/flatMap';

export const getAllWalletsAddresses = (
  wallets: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[] = []
): Wallet.Cardano.PaymentAddress[] => [
  ...new Set(flatMap(wallets.map(({ metadata: { walletAddresses = [] } }) => walletAddresses)))
];
