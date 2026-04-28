import type { AnyBlockchainAddress } from '@lace-contract/addresses';
import type { AnalyticsUser } from '@lace-contract/analytics';
import type { SupportedLanguage } from '@lace-contract/i18n';
import type { State } from '@lace-contract/module';
import type { Token } from '@lace-contract/tokens';
import type { ColorScheme } from '@lace-contract/views';
import type { AnyWallet, WalletId } from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';
import type { Action, Store } from '@reduxjs/toolkit';

export type DevelopmentApi = {
  addWallet: (wallet: AnyWallet) => Promise<WalletId>;
  getAddresses: (blockchain: BlockchainName) => AnyBlockchainAddress[];
  getAnalyticsUser: () => AnalyticsUser | undefined;
  getColorScheme: () => ColorScheme;
  getTokens: (blockchain: BlockchainName) => Token[];
  getWallets: () => AnyWallet[];
  reloadExtension: () => void;
  removeWallet: (walletId: WalletId) => Promise<WalletId>;
  setColorScheme: (colorScheme: ColorScheme) => Promise<void>;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  store: Store<State, Action>;
  waitForState: (predicate: (state: State) => boolean) => Promise<State>;
  toggleReactScan: () => void;
};
