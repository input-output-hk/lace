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

const posthogWeb = inferModuleContext({
  moduleName: ModuleName('posthog-client-web'),
  implements: combineContracts([posthogDependencyContract] as const),
  store,
  addons: {},
});

// Carbon only. The extension's service worker keeps `posthog-node`
// (posthog-client-extension), and the v2 guest ships no PostHog client at all.
const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': posthogWeb,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof posthogWeb>;
export type ActionCreators = ModuleActionCreators<typeof posthogWeb>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
