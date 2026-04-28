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

const posthogMobile = inferModuleContext({
  moduleName: ModuleName('posthog-client-react-native'),
  implements: combineContracts([posthogDependencyContract] as const),
  store,
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': posthogMobile,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof posthogMobile>;
export type ActionCreators = ModuleActionCreators<typeof posthogMobile>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
