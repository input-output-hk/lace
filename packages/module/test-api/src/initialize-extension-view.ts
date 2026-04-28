import { filterAddressesByBlockchainName } from '@lace-contract/addresses';
import { waitForState } from '@lace-contract/dev';
import { type State, typedLaceContext } from '@lace-contract/module';
import {
  type ColorScheme,
  type InitializeExtensionView,
} from '@lace-contract/views';

import type { ActionCreators, AvailableAddons, Selectors } from '.';
import type { DevelopmentGlobalApi } from '@lace-contract/dev';
import type { SupportedLanguage } from '@lace-contract/i18n';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { AnyWallet, WalletId } from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';

const initializeExtensionView: ContextualLaceInit<
  InitializeExtensionView,
  AvailableAddons
> = () => (store, context) => {
  const { actions, selectors } = typedLaceContext<Selectors, ActionCreators>(
    context,
  );

  const walletExists = (id: WalletId) => (state: State) =>
    selectors.wallets.selectAll(state).some(w => w.walletId === id);
  const api = window as unknown as DevelopmentGlobalApi;
  api.getWallets = () => selectors.wallets.selectAll(store.getState());
  api.getAddresses = (blockchain: BlockchainName) =>
    filterAddressesByBlockchainName(
      selectors.addresses.selectAllAddresses(store.getState()),
      blockchain,
    );
  api.getTokens = () => selectors.tokens.selectAllTokens(store.getState());
  api.getColorScheme = () =>
    selectors.views.selectColorScheme(store.getState());
  api.getAnalyticsUser = () =>
    selectors.analytics.selectAnalyticsUser(store.getState());
  api.addWallet = async (wallet: AnyWallet) => {
    store.dispatch(actions.wallets.addWallet(wallet));
    await waitForState(walletExists(wallet.walletId), store);
    return wallet.walletId;
  };
  api.removeWallet = async (walletId: WalletId) => {
    const wallet = selectors.wallets
      .selectAll(store.getState())
      .find(w => w.walletId === walletId);
    const accountIds = wallet?.accounts.map(account => account.accountId) ?? [];
    store.dispatch(actions.wallets.removeWallet(walletId, accountIds));
    await waitForState(walletExists(walletId), store);
    return walletId;
  };
  api.setColorScheme = async (colorScheme: ColorScheme) => {
    store.dispatch(actions.views.setColorScheme(colorScheme));
    await waitForState(
      state => selectors.views.selectColorScheme(state) === colorScheme,
      store,
    );
  };
  api.setLanguage = async (language: SupportedLanguage) => {
    store.dispatch(actions.views.setLanguage(language));
    await waitForState(
      state => selectors.views.selectLanguage(state) === language,
      store,
    );
  };
  api.store = store;
  api.waitForState = async predicate => waitForState(predicate, store);
  api.reloadExtension = () => store.dispatch(actions.app.reloadApplication());

  api.toggleReactScan = () => {
    localStorage.setItem(
      'react-scan-enabled',
      localStorage.getItem('react-scan-enabled') === 'true' ? 'false' : 'true',
    );
    window.location.reload();
  };
};

export default initializeExtensionView;
