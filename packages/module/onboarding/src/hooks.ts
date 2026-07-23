import { loadedActionCreators, loadedSelectors } from '@lace-contract/module';
import {
  getPendingCreateWalletSecretsSnapshot,
  subscribePendingCreateWalletSecrets,
} from '@lace-contract/onboarding-v2';
import {
  createContextualUseLoadModules,
  createUseDispatchLaceAction,
  createUseLaceSelectorHook,
} from '@lace-lib/util-render';
import { useSyncExternalStore } from 'react';

import type { ActionCreators, AvailableAddons, Selectors } from '.';
import type { PendingCreateWalletSecrets } from '@lace-contract/onboarding-v2';
import type { UseLaceSelectorHook } from '@lace-lib/util-render';

export const useLaceSelector: UseLaceSelectorHook<Selectors> =
  createUseLaceSelectorHook<Selectors>(loadedSelectors);

export const useDispatchLaceAction =
  createUseDispatchLaceAction<ActionCreators>(loadedActionCreators);

export const useLoadModules = createContextualUseLoadModules<AvailableAddons>();

/**
 * Reactive view of the off-Redux onboarding secrets buffer (LW-14498).
 * Re-renders when the staged password/recovery phrase change.
 */
export const usePendingCreateWalletSecrets = (): PendingCreateWalletSecrets =>
  useSyncExternalStore(
    subscribePendingCreateWalletSecrets,
    getPendingCreateWalletSecretsSnapshot,
  );
