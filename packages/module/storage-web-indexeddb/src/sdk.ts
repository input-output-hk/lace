import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { storageDependencyContract } from '@lace-contract/storage';

import store from './store';

/**
 * Browser storage in IndexedDB: the wallet's persisted state lasts across
 * page loads and sessions.
 */
export default inferModuleContext({
  moduleName: ModuleName('storage-web-indexeddb'),
  implements: combineContracts([storageDependencyContract] as const),
  store,
  addons: {},
});
