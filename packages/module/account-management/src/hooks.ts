import {
  getRestoreWalletSecretsSnapshot,
  subscribeRestoreWalletSecrets,
} from '@lace-contract/account-management';
import { loadedActionCreators, loadedSelectors } from '@lace-contract/module';
import {
  createContextualUseLoadModules,
  createUseDispatchLaceAction,
  createUseLaceSelectorHook,
} from '@lace-lib/util-render';
import { useSyncExternalStore } from 'react';

import type { ActionCreators, AvailableAddons, Selectors } from './index';
import type { RestoreWalletSecrets } from '@lace-contract/account-management';
import type { UseLaceSelectorHook } from '@lace-lib/util-render';

export const useLaceSelector: UseLaceSelectorHook<Selectors> =
  createUseLaceSelectorHook<Selectors>(loadedSelectors);

export const useDispatchLaceAction =
  createUseDispatchLaceAction<ActionCreators>(loadedActionCreators);

export const useLoadModules = createContextualUseLoadModules<AvailableAddons>();

export const useLoadedOnboardingOptions = () =>
  useLoadModules('addons.loadOnboardingOptions');

/**
 * Reactive view of the off-Redux restore wallet secrets buffer (LW-14498).
 * Re-renders when the staged recovery phrase changes.
 */
export const useRestoreWalletSecrets = (): RestoreWalletSecrets =>
  useSyncExternalStore(
    subscribeRestoreWalletSecrets,
    getRestoreWalletSecretsSnapshot,
  );
