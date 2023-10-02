import { Wallet } from '@lace/cardano';
import { AdaSymbol } from './types';

export const MAX_POOLS_COUNT = 5;
export const LAST_STABLE_EPOCH = 2;
export const PERCENTAGE_SCALE_MAX = 100; // 0-100

export const CARDANO_COIN_SYMBOL: Record<Wallet.Cardano.NetworkId, AdaSymbol> = {
  [Wallet.Cardano.NetworkId.Mainnet]: 'ADA',
  [Wallet.Cardano.NetworkId.Testnet]: 'tADA',
};
