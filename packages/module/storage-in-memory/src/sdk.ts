import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { storageDependencyContract } from '@lace-contract/storage';

import store from './store';

/**
 * In-memory storage: the wallet's persisted state lasts as long as the
 * process.
 */
export default inferModuleContext({
  moduleName: ModuleName('storage-in-memory'),
  implements: combineContracts([storageDependencyContract] as const),
  store,
  addons: {},
});
