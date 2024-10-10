import type { Events } from '../../features/analytics/events';
import type { WalletType } from '@cardano-sdk/web-extension';
import type { Wallet } from '@lace/cardano';

export interface CommonOutsideHandlesContextValue {
  cardanoCoin: Wallet.CoinId;
  walletType: WalletType;
  openHWFlow: (path: string) => void;
  inMemoryWallet: Wallet.ObservableWallet;
  withSignTxConfirmation: <T>(
    action: () => Promise<T>,
    password?: string,
  ) => Promise<T>;
  sendEventToPostHog: (action: Events) => Promise<void>;
}
