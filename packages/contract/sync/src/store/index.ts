import { inferStoreContext } from '@lace-contract/module';

import {
  selectGlobalSyncStatus,
  selectActiveAccountSyncProgress,
  selectAverageSyncProgress,
  selectAllFailedOperations,
  selectHasEverSynced,
} from './selectors';
import { syncActions, syncSelectors as sliceSelectors } from './slice';

export { syncActions } from './slice';
export {
  selectGlobalSyncStatus,
  selectActiveAccountSyncProgress,
  selectAverageSyncProgress,
  selectAllFailedOperations,
  selectHasEverSynced,
  computeAccountSyncingProgress,
} from './selectors';

export type * from './slice';

// Combine slice selectors with aggregation selectors under sync namespace
export const syncSelectors = {
  sync: {
    ...sliceSelectors.sync,
    selectActiveAccountSyncProgress,
    selectGlobalSyncStatus,
    selectAverageSyncProgress,
    selectAllFailedOperations,
    selectHasEverSynced,
  },
};

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: syncActions,
    selectors: syncSelectors,
  },
});
