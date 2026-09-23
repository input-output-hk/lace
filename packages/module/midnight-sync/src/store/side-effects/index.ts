import { merge } from 'rxjs';

import { loadActivityDetails, updateActivities } from './activities';
import {
  createClearWalletStateOnResync,
  createDeleteWalletSideEffect,
  createResetSyncStateSideEffect,
  requestResyncWallet,
  resyncWalletOnConfigChangeFromFeatureFlags,
} from './resync';
import {
  autoDismissMidnightSyncFailureOnResume,
  autoDismissMidnightSyncFailureOnSyncSuccess,
} from './sync-failure';
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
          // accountId is the id every lookup keys on, and unlike
          // walletId+networkId it cannot collide between two entries — a
          // collision here would silently merge two accounts' documents.
          computeDocId: wallet => String(wallet.accountId),
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
          autoDismissMidnightSyncFailureOnResume,
          autoDismissMidnightSyncFailureOnSyncSuccess,
          accountWalletWatcher,
        ].map(sideEffect =>
          sideEffect(actionObservables, stateObservables, dependencies),
        ),
      );
    },
  ];
};
