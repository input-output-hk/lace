import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { storageDependencyContract } from '@lace-contract/storage';

import store from './store';

export default inferModuleContext({
  moduleName: ModuleName('storage-web-indexeddb'),
  implements: combineContracts([storageDependencyContract] as const),
  store,
  addons: {},
});
