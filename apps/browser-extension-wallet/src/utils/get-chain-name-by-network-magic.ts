import { Wallet } from '@lace/cardano';

export const getChainNameByNetworkMagic = (networkMagic: Wallet.Cardano.NetworkMagics): Wallet.ChainName =>
  Object.entries(Wallet.Cardano.ChainIds).find(([, ids]) => ids.networkMagic === networkMagic)[0] as Wallet.ChainName;
