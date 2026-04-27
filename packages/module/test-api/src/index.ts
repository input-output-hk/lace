import './augmentations';

import { addressesStoreContract } from '@lace-contract/addresses';
import { analyticsStoreContract } from '@lace-contract/analytics';
import { appStoreContract } from '@lace-contract/app';
import { devContract } from '@lace-contract/dev';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
  isProductionEnvironment,
} from '@lace-contract/module';
import { tokensStoreContract } from '@lace-contract/tokens';
import {
  initializeExtensionViewAddonContract,
  initializeMobileViewAddonContract,
  viewsStoreContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import { TEST_API_FEATURE_FLAG } from './const';

export { TEST_API_FEATURE_FLAG } from './const';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceModuleMap,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  devContract,
  initializeExtensionViewAddonContract,
  initializeMobileViewAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  featureStoreContract,
  viewsStoreContract,
  analyticsStoreContract,
  appStoreContract,
  addressesStoreContract,
  tokensStoreContract,
  walletRepoStoreContract,
] as const);

const extensionModule = inferModuleContext({
  moduleName: ModuleName('test-api'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    metadata: { name: 'Test API', description: 'Utils for e2e tests' },
    willLoad: (featureFlags, environment) =>
      !isProductionEnvironment(environment) &&
      featureFlags.some(({ key }) => key === TEST_API_FEATURE_FLAG),
  },
  addons: {
    loadInitializeExtensionView: async () =>
      import('./initialize-extension-view'),
    loadInitializeMobileView: async () => import('./initialize-extension-view'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
  'lace-mobile': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
