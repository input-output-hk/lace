import { appLockStoreContract } from '@lace-contract/app-lock';
import {
  authenticationPromptDeferBiometricPromptAddon,
  authenticationPromptStoreContract,
} from '@lace-contract/authentication-prompt';
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
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  authenticationPromptDeferBiometricPromptAddon,
] as const);
const dependsOnContracts = combineContracts([
  appLockStoreContract,
  authenticationPromptStoreContract,
] as const);

const mobileModule = inferModuleContext({
  moduleName: ModuleName('app-activity-mobile'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadDeferBiometricPromptUntilActive: async () =>
      import('./addons/defer-biometric-prompt-until-active-extension'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': mobileModule,
};

export default moduleMap;

export { ActivityDetector } from './ActivityDetector';

export type Selectors = ModuleSelectors<typeof mobileModule>;
export type ActionCreators = ModuleActionCreators<typeof mobileModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
