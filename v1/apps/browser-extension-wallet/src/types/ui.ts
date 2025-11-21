import { Wallet } from '@lace/cardano';
import { AppMode } from '@src/utils/constants';

export enum NetworkConnectionStates {
  CONNNECTED = 'connected',
  OFFLINE = 'offline'
}

export interface WalletUIProps {
  currentChain: Wallet.Cardano.ChainId;
  appMode: AppMode;
}

export interface WalletUI {
  cardanoCoin: Wallet.CoinId;
  appMode: AppMode;
  networkConnection: NetworkConnectionStates;
  isDropdownMenuOpen: boolean;
  areBalancesVisible: boolean;
  canManageBalancesVisibility: boolean;
  getHiddenBalancePlaceholder: (placeholderLength?: number, placeholderChar?: string) => string;
}
