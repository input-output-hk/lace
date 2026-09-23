import { FeatureFlagKey, featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { notificationCenterStoreContract } from '@lace-contract/notification-center';
import { viewsStoreContract } from '@lace-contract/views';

import type { LaceModuleMap } from '@lace-contract/module';

// The state-only arm of this module: the same dependencies and feature gate,
// without the page addons. Those addons are react-native presentation, and an
// addon thunk is a live property of the module object — no static analysis can
// drop it — so an ESM bundler emits a chunk per addon and parses the whole
// react-native chain behind it. A DOM guest therefore loads this entry instead
// of `./index` and renders its own UI over the same state. The contract lists
// are stated again rather than shared: sharing would make `./index` import this
// file, and `implements` must shed every contract whose addon is gone, since a
// module supplies an addon for each contract it implements.
const implementsContracts = combineContracts([
  notificationCenterStoreContract,
] as const);
const dependsOnContracts = combineContracts([
  featureStoreContract,
  viewsStoreContract,
] as const);

const stateModule = inferModuleContext({
  moduleName: ModuleName('notification-center'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    willLoad: (featureFlags, _environment) => {
      return featureFlags.some(
        flag => flag.key === FeatureFlagKey('NOTIFICATION_CENTER'),
      );
    },
    metadata: {
      name: 'Notifications Center',
      description: 'Module for managing notifications in the application',
    },
  },
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': stateModule,
};

export default moduleMap;
