import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { posthogDependencyContract } from '@lace-contract/posthog';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

const posthogExtension = inferModuleContext({
  moduleName: ModuleName('posthog-client-extension'),
  implements: combineContracts([posthogDependencyContract] as const),
  store,
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension': posthogExtension,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof posthogExtension>;
export type ActionCreators = ModuleActionCreators<typeof posthogExtension>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
