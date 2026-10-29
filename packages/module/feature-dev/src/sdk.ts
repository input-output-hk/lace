import { inferModuleContext, ModuleName } from '@lace-contract/module';

import { implementsContracts } from './sdk-contracts';
import store from './store';

/**
 * Feature flags the app sets: the wallet starts with the flags passed to
 * `createLaceWallet`, and dispatching `featureDev.setFeatureFlags` replaces
 * them.
 */
export default inferModuleContext({
  moduleName: ModuleName('feature-dev'),
  implements: implementsContracts,
  store,
  addons: {},
});
