import { Wallet } from '@lace/cardano';
import { AppMode } from '@src/utils/constants';
import { CoinId } from './wallet';

export enum NetworkConnectionStates {
  CONNNECTED = 'connected',
  OFFLINE = 'offline'
}

export interface WalletUIProps {
  currentChain: Wallet.Cardano.ChainId;
  appMode: AppMode;
}

export interface WalletUI {
  cardanoCoin: CoinId;
  appMode: AppMode;
  networkConnection: NetworkConnectionStates;
  areBalancesVisible: boolean;
  canManageBalancesVisibility: boolean;
  hiddenBalancesPlaceholder?: string;
}
