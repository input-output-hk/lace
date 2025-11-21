import type { Events } from '../../features/analytics/events';
import type { HandleProvider } from '@cardano-sdk/core';
import type { WalletType } from '@cardano-sdk/web-extension';
import type { Wallet } from '@lace/cardano';
import type { PostHogProperties } from '@lace/common';

export enum NetworkConnectionStates {
  CONNNECTED = 'connected',
  OFFLINE = 'offline',
}

export interface CommonOutsideHandlesContextValue {
  cardanoCoin: Wallet.CoinId;
  walletType: WalletType;
  openHWFlow: (path: string) => void;
  inMemoryWallet: Wallet.ObservableWallet;
  withSignTxConfirmation: <T>(
    action: () => Promise<T>,
    password?: string,
  ) => Promise<T>;
  sendEventToPostHog: (
    action: Events,
    properties?: PostHogProperties,
  ) => Promise<void>;
  handleResolver: HandleProvider;
  useNetworkError: (cb: () => void) => void;
  networkConnection: NetworkConnectionStates;
}
