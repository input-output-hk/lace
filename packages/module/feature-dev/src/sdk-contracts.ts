// The contracts the SDK's feature-dev module implements, and the types its
// store is written against in the stable SDK build (contracts.stable.ts).
import {
  featureStoreContract,
  featureDependencyContract,
} from '@lace-contract/feature';
import { combineContracts } from '@lace-contract/module';

import type store from './store';
import type {
  ContractsActionCreators,
  ContractsSelectors,
  LaceSideEffect,
  ModuleAddons,
  ModuleStoreActionCreators,
  ModuleStoreSelectors,
} from '@lace-contract/module';

export const implementsContracts = combineContracts([
  featureStoreContract,
  featureDependencyContract,
] as const);

export type Selectors = ContractsSelectors<typeof implementsContracts> &
  ModuleStoreSelectors<typeof store>;
export type ActionCreators = ContractsActionCreators<
  typeof implementsContracts
> &
  ModuleStoreActionCreators<typeof store>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<typeof implementsContracts>;
