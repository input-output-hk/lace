import { Wallet } from '@lace/cardano';

export type ADASymbols = '₳' | 't₳';

export const CARDANO_COIN_SYMBOL: { [key in Wallet.Cardano.NetworkId]: ADASymbols } = {
  [Wallet.Cardano.NetworkId.Mainnet]: '₳',
  [Wallet.Cardano.NetworkId.Testnet]: 't₳'
};
