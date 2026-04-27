import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { storageDependencyContract } from '@lace-contract/storage';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

// exporting anything other than a module from a module package is an anti-pattern
// however, this is required to bootstrap the application in order to select
// modules to load, before they are loaded
export const loadCreateDocumentStorage = async () => {
  const { createDocumentStorage } = await import('./create-document-storage');
  return createDocumentStorage;
};

const extensionModule = inferModuleContext({
  moduleName: ModuleName('storage-extension'),
  implements: combineContracts([storageDependencyContract] as const),
  store,
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
  'lace-mobile': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
