import { airGappedQrExchangeStoreContract } from '@lace-contract/air-gapped-qr-exchange';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { globalOverlaysAddonContract } from '@lace-contract/views';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  globalOverlaysAddonContract,
  airGappedQrExchangeStoreContract,
] as const);

const dependsOnContracts = combineContracts([
  airGappedQrExchangeStoreContract,
] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('air-gapped-qr-exchange-host'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  addons: {
    loadGlobalOverlays: async () => import('./addons/load-global-overlays'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': multiPlatformModule,
  'lace-mobile': multiPlatformModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof multiPlatformModule>;
export type ActionCreators = ModuleActionCreators<typeof multiPlatformModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
