import {
  appLockActivityChannelAddon,
  appLockStoreContract,
} from '@lace-contract/app-lock';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  appLockActivityChannelAddon,
] as const);
const dependsOnContracts = combineContracts([appLockStoreContract] as const);

const webModule = inferModuleContext({
  moduleName: ModuleName('app-activity-web'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  addons: {
    loadActivityChannelExtension: async () =>
      import('./addons/activity-channel-extension'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': webModule,
};

export default moduleMap;

export { ActivityDetector } from './ActivityDetector';

export type Selectors = ModuleSelectors<typeof webModule>;
export type ActionCreators = ModuleActionCreators<typeof webModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
