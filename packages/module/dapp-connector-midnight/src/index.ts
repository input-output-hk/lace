import './augmentations';

import { analyticsStoreContract } from '@lace-contract/analytics';
import { appLockStoreContract } from '@lace-contract/app-lock';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import {
  dappConnectorApiAddonContract,
  dappConnectorStoreContract,
} from '@lace-contract/dapp-connector';
import { featureStoreContract } from '@lace-contract/feature';
import {
  midnightContextStoreContract,
  midnightDependencyContract,
} from '@lace-contract/midnight-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  renderRootAddonContract,
  viewsStoreContract,
} from '@lace-contract/views';

import { FEATURE_FLAG_MIDNIGHT_DAPP_CONNECTOR } from './const';
import { dappConnectorApi } from './dapp-connector-api';
import laceExtensionStore from './store/lace-extension-store';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceModuleMap,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

export { FEATURE_FLAG_MIDNIGHT_DAPP_CONNECTOR } from './const';

const implementsContracts = combineContracts([
  dappConnectorApiAddonContract,
  renderRootAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  analyticsStoreContract,
  appLockStoreContract,
  featureStoreContract,
  midnightContextStoreContract,
  midnightDependencyContract,
  authenticationPromptStoreContract,
  viewsStoreContract,
  dappConnectorStoreContract,
] as const);

const willLoad = (featureFlags: ReadonlyArray<{ key: string }>) =>
  featureFlags.some(flag => flag.key === FEATURE_FLAG_MIDNIGHT_DAPP_CONNECTOR);

const featureMetadata = {
  name: 'MidnightDappConnector',
  description: 'Midnight blockchain dapp connector support',
};

const laceExtensionModule = inferModuleContext({
  moduleName: ModuleName('midnight-dapp-connector'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    willLoad,
    metadata: featureMetadata,
  },
  store: laceExtensionStore,
  addons: {
    dappConnectorApi,
    renderRoot: {
      sidePanel: async () => import('./render/lace-extension-render'),
      popupWindow: async () => import('./render/lace-extension-render'),
    },
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': laceExtensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof laceExtensionModule>;
export type ActionCreators = ModuleActionCreators<typeof laceExtensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
