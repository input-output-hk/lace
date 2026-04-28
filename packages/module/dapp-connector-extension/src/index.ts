import { dappConnectorPlatformDependencyContract } from '@lace-contract/dapp-connector';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';

import { DAPP_CONNECTOR_FF_KEY } from './const';
import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  dappConnectorPlatformDependencyContract,
] as const);
const dependsOnContracts = combineContracts([featureStoreContract] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('dapp-connector-extension'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {},
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key.includes(DAPP_CONNECTOR_FF_KEY)),
    metadata: {
      name: 'DappConnectorExtension',
      description: 'Extension platform implementation for dApp connector',
    },
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': multiPlatformModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof multiPlatformModule>;
export type ActionCreators = ModuleActionCreators<typeof multiPlatformModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
