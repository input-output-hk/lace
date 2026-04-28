import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { viewsStoreContract } from '@lace-contract/views';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

const extensionModule = inferModuleContext({
  moduleName: ModuleName('views-mobile'),
  implements: combineContracts([viewsStoreContract] as const),
  store,
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
