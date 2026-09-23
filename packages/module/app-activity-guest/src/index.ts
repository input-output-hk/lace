// The guest's app-reload seam. app-activity-mobile
// (dropped from the guest loadout with app-lock) was the guest's sole provider of
// `performAppReloadDependencyContract`, consumed by the app store's
// `performAppReload` side effect. The guest is a sandboxed iframe (ADR 35), so it
// reloads its own document with `window.location.reload()` — the web analog of
// mobile's `Updates.reloadAsync()` / the extension's `runtime.reload()`.
//
// app-activity-mobile's other seams need no replacement here: its
// `featureFlagRefreshTriggerDependencyContract` has no guest dependent
// (feature-posthog is not loaded) and its activity-channel / defer-biometric
// addons are zero-or-more.
import { performAppReloadDependencyContract } from '@lace-contract/app';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  performAppReloadDependencyContract,
] as const);

const guestModule = inferModuleContext({
  moduleName: ModuleName('app-activity-guest'),
  implements: implementsContracts,
  store,
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': guestModule,
  'lace-extension-guest': guestModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof guestModule>;
export type ActionCreators = ModuleActionCreators<typeof guestModule>;
