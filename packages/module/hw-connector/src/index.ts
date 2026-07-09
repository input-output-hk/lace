import './augmentations';

import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { sheetPagesAddonContract } from '@lace-contract/views';
import { requestHWConnectionAddonContract } from '@lace-contract/wallet-repo';

import store from './mobile-store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const sharedImplementsContracts = [requestHWConnectionAddonContract] as const;
const sharedDependsOnContracts = [] as const;

const sharedModulePart = {
  moduleName: ModuleName('hw-connector'),
} as const;

const webImplementsContracts = combineContracts([
  ...sharedImplementsContracts,
] as const);
const webDependsOnContracts = combineContracts([
  ...sharedDependsOnContracts,
] as const);

const webModule = inferModuleContext({
  ...sharedModulePart,
  implements: webImplementsContracts,
  dependsOn: webDependsOnContracts,
  addons: {
    loadRequestHWConnections: async () =>
      import('./addons/request-hw-connection-web'),
  },
});

const mobileImplementsContracts = combineContracts([
  ...sharedImplementsContracts,
  sheetPagesAddonContract,
] as const);
const mobileDependsOnContracts = combineContracts([
  ...sharedDependsOnContracts,
] as const);

const mobileModule = inferModuleContext({
  ...sharedModulePart,
  implements: mobileImplementsContracts,
  dependsOn: mobileDependsOnContracts,
  store,
  addons: {
    loadRequestHWConnections: async () =>
      import('./addons/request-hw-connection-mobile'),
    loadSheetPages: async () => import('./addons/load-sheet-pages-mobile'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': webModule,
  'lace-mobile': mobileModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof mobileModule>;
export type ActionCreators = ModuleActionCreators<typeof mobileModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof mobileImplementsContracts,
  typeof mobileDependsOnContracts
>;
