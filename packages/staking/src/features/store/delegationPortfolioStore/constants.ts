import { Wallet } from '@lace/cardano';
import { AdaSymbol } from './types';

export const MAX_POOLS_COUNT = 5;
export const LAST_STABLE_EPOCH = 2;
export const PERCENTAGE_SCALE_MAX = 100; // 0-100

// tmp hotfix before release: disabling several features depending on portfolio persistence
// which is not implemented yet
export const TMP_HOTFIX_PORTFOLIO_STORE_NOT_PERSISTED = true;

export const CARDANO_COIN_SYMBOL: Record<Wallet.Cardano.NetworkId, AdaSymbol> = {
  [Wallet.Cardano.NetworkId.Mainnet]: 'ADA',
  [Wallet.Cardano.NetworkId.Testnet]: 'tADA',
};
