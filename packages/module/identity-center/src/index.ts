import { FeatureFlagKey } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  sheetPagesAddonContract,
  tabPagesAddonContract,
  stackPagesAddonContract,
  viewsStoreContract,
} from '@lace-contract/views';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const IDENTITY_FEATURE_FLAG = FeatureFlagKey('IDENTITY_CENTER');

const implementsContracts = combineContracts([
  stackPagesAddonContract,
  tabPagesAddonContract,
  sheetPagesAddonContract,
] as const);

const dependsOnContracts = combineContracts([viewsStoreContract] as const);

const extensionModule = inferModuleContext({
  moduleName: ModuleName('identity-center'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === IDENTITY_FEATURE_FLAG),
    metadata: {
      name: 'IdentityCenter',
      description: 'Identity center',
    },
  },
  addons: {
    loadStackPages: async () => import('./addons/stackPages'),
    loadTabPages: async () => import('./addons/tabPages'),
    loadSheetPages: async () => import('./addons/sheetPages'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
  'lace-mobile': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;

export { IDENTITY_FEATURE_FLAG };
