import { analyticsStoreContract } from '@lace-contract/analytics';
import { featureStoreContract } from '@lace-contract/feature';
import {
  ContractName,
  combineContracts,
  combineStore,
  createMixin,
  inferContractContext,
} from '@lace-contract/module';
import { tokensStoreContract } from '@lace-contract/tokens';
import { viewsStoreContract } from '@lace-contract/views';

import store from './store';
import { appUiAddonDependencies } from './ui-addon-dependencies';

import type {
  ContractActionCreators,
  ContractSelectors,
} from '@lace-contract/module';

// Provides platform-specific app reload (mobile: `Updates.reloadAsync`; extension: `runtime.reload`)
// SideEffectDependencies: performAppReload
export const performAppReloadDependencyContract = inferContractContext({
  contractType: 'sideEffectDependency',
  name: ContractName('perform-app-reload-dependency'),
  instance: 'exactly-one',
});

export const appStoreContract = inferContractContext({
  name: ContractName('app-store'),
  instance: 'exactly-one',
  contractType: 'store',
  dependsOn: combineContracts([
    viewsStoreContract,
    ...appUiAddonDependencies,
    analyticsStoreContract,
    featureStoreContract,
    tokensStoreContract,
    performAppReloadDependencyContract,
  ] as const),
  mixin: createMixin(laceModule => ({
    store: combineStore(laceModule, store),
  })),
});

export type Selectors = ContractSelectors<typeof appStoreContract>;
export type ActionCreators = ContractActionCreators<typeof appStoreContract>;
