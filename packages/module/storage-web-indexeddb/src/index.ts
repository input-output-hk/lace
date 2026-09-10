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

const webModule = inferModuleContext({
  moduleName: ModuleName('storage-web-indexeddb'),
  implements: combineContracts([storageDependencyContract] as const),
  store,
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension-guest': webModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof webModule>;
export type ActionCreators = ModuleActionCreators<typeof webModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;

// exporting anything other than a module from a module package is an anti-pattern
// however, this is required to bootstrap the application in order to select
// modules to load, before they are loaded
export const loadCreateDocumentStorage = async () => {
  const { createDocumentStorage } = await import('./create-document-storage');
  return createDocumentStorage;
};
