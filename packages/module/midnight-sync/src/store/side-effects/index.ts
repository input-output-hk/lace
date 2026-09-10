import { merge } from 'rxjs';

import { loadActivityDetails, updateActivities } from './activities';
import {
  createClearWalletStateOnResync,
  createDeleteWalletSideEffect,
  createResetSyncStateSideEffect,
  requestResyncWallet,
  resyncWalletOnConfigChangeFromFeatureFlags,
} from './resync';
import { fetchNetworkTermsAndConditions } from './terms-and-conditions';
import { watchMidnightAccount, watchMidnightAccounts } from './watch';

import type { SideEffect } from '../..';
import type { SerializedMidnightWallet } from '@lace-contract/midnight-context';
import type { LaceInitSync } from '@lace-contract/module';

export const initializeSideEffects: LaceInitSync<SideEffect[]> = () => {
  return [
    (actionObservables, stateObservables, dependencies) => {
      const midnightStateStorage =
        dependencies.createCollectionStorage<SerializedMidnightWallet>({
          collectionId: 'midnightWalletState',
          computeDocId: wallet => `${wallet.walletId}-${wallet.networkId}`,
        });

      const deleteWallet = createDeleteWalletSideEffect(midnightStateStorage);
      const clearWalletStateOnResync =
        createClearWalletStateOnResync(midnightStateStorage);
      const resetSyncState =
        createResetSyncStateSideEffect(midnightStateStorage);

      // New account-based wallet management replaces:
      // - createUnlockWalletSideEffect (wallet lifecycle)
      // - triggerUnlockFromAuthenticationPrompt (auth trigger)
      // - createUpsertAddresses (now in subscribeToWallet)
      // - createUpdateSyncProgress (now in subscribeToWallet)
      // - updateDustBalance (now in subscribeToWallet)
      // - createUpdateTokens (now in subscribeToWallet)
      const accountWalletWatcher = watchMidnightAccounts(
        midnightStateStorage,
        watchMidnightAccount,
      );

      return merge(
        ...[
          updateActivities,
          loadActivityDetails,
          deleteWallet,
          clearWalletStateOnResync,
          resetSyncState,
          resyncWalletOnConfigChangeFromFeatureFlags,
          requestResyncWallet,
          accountWalletWatcher,
          fetchNetworkTermsAndConditions,
        ].map(sideEffect =>
          sideEffect(actionObservables, stateObservables, dependencies),
        ),
      );
    },
  ];
};
