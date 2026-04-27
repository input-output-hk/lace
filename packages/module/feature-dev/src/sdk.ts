import {
  featureStoreContract,
  featureDependencyContract,
} from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';

import store from './store';

export default inferModuleContext({
  moduleName: ModuleName('feature-dev'),
  implements: combineContracts([
    featureStoreContract,
    featureDependencyContract,
  ] as const),
  store,
  addons: {},
});
