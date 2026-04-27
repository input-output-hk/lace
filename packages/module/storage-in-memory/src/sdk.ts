import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { storageDependencyContract } from '@lace-contract/storage';

import store from './store';

export default inferModuleContext({
  moduleName: ModuleName('storage-in-memory'),
  implements: combineContracts([storageDependencyContract] as const),
  store,
  addons: {},
});
