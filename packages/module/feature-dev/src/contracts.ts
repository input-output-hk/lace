// The contracts the feature-dev module implements in the apps, and the types
// its store is written against.
// The stable SDK build resolves contracts.stable.ts in place of this file, which
// types the store against the contracts the SDK's module implements.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.
import { devContract } from '@lace-contract/dev';
import {
  featureStoreContract,
  featureDependencyContract,
} from '@lace-contract/feature';
import { combineContracts } from '@lace-contract/module';
import { initializeExtensionViewAddonContract } from '@lace-contract/views';

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
  devContract,
  initializeExtensionViewAddonContract,
] as const);

export type Selectors = ContractsSelectors<typeof implementsContracts> &
  ModuleStoreSelectors<typeof store>;
export type ActionCreators = ContractsActionCreators<
  typeof implementsContracts
> &
  ModuleStoreActionCreators<typeof store>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<typeof implementsContracts>;
