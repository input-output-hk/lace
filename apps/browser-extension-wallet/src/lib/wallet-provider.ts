import { Wallet } from '@lace/cardano';

export type IWalletProvider = Wallet.ChainHistoryProvider & Wallet.StakePoolProvider;

export const IWalletProvider = {
  fromSdk: (sdkProvider: Wallet.ChainHistoryProvider & Wallet.StakePoolProvider): IWalletProvider => ({
    ...sdkProvider
  })
};
