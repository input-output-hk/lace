import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { storageDependencyContract } from '@lace-contract/storage';

import store from './store';

import type {
  LaceModuleMap,
  LaceSideEffect,
  ModuleActionCreators,
  ModuleSelectors,
} from '@lace-contract/module';

const sharedModule = inferModuleContext({
  moduleName: ModuleName('storage-multi-platform'),
  implements: combineContracts([storageDependencyContract] as const),
  store,
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': sharedModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof sharedModule>;
export type ActionCreators = ModuleActionCreators<typeof sharedModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;

// exporting anything other than a module from a module package is an anti-pattern
// however, this is required to bootstrap the application in order to select
// modules to load, before they are loaded
export const loadCreateDocumentStorage = async () => {
  const { createDocumentStorage } = await import('./create-document-storage');
  return createDocumentStorage;
};
