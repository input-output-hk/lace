import { merge } from 'rxjs';

import { loadActivityDetails, updateActivities } from './activities';
import { watchProofActivities, dismissProofActivity } from './proof-activities';
import { migrateUnavailableProofServerSelection } from './proof-server-kill-switch';
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
import {
  clearTeeAttestationProgressOnNewTx,
  watchTeeAttestationProgress,
} from './tee-attestation-progress';
import { watchMidnightAccount, watchMidnightAccounts } from './watch';

import type { SideEffect } from '../../context';
import type { SerializedMidnightWallet } from '@lace-contract/midnight-context';
import type { LaceInitSync } from '@lace-contract/module';
import type { CollectionStorage } from '@lace-contract/storage';

/**
 * The engine's side effects plus the ones a loadout adds over the same
 * persisted wallet-state storage. The engine set reads only the contracts
 * the engine itself depends on; a loadout decides what else it can run.
 */
export const createInitializeSideEffects =
  (
    loadoutSideEffects: (
      storage: CollectionStorage<SerializedMidnightWallet>,
    ) => SideEffect[],
  ): LaceInitSync<SideEffect[]> =>
  () =>
    [
      (actionObservables, stateObservables, dependencies) => {
        const midnightStateStorage =
          dependencies.createCollectionStorage<SerializedMidnightWallet>({
            collectionId: 'midnightWalletState',
            // accountId is the id every lookup keys on, and unlike
            // walletId+networkId it cannot collide between two entries — a
            // collision here would silently merge two accounts' documents.
            computeDocId: wallet => String(wallet.accountId),
          });

        return merge(
          ...[
            updateActivities,
            loadActivityDetails,
            createDeleteWalletSideEffect(midnightStateStorage),
            createClearWalletStateOnResync(midnightStateStorage),
            requestResyncWallet,
            autoDismissMidnightSyncFailureOnResume,
            autoDismissMidnightSyncFailureOnSyncSuccess,
            watchMidnightAccounts(midnightStateStorage, watchMidnightAccount),
            ...loadoutSideEffects(midnightStateStorage),
          ].map(sideEffect =>
            sideEffect(actionObservables, stateObservables, dependencies),
          ),
        );
      },
    ];

// The extension's reset-sync-state reloads the application; its feature-flag resync waits
// for the app lock, the proof-server migration toasts, and attestation
// progress feeds the send-flow checklist, so all of them need the app shell.
export const initializeSideEffects = createInitializeSideEffects(storage => [
  createResetSyncStateSideEffect(storage),
  resyncWalletOnConfigChangeFromFeatureFlags,
  migrateUnavailableProofServerSelection,
  watchProofActivities,
  dismissProofActivity,
  watchTeeAttestationProgress,
  clearTeeAttestationProgressOnNewTx,
]);
