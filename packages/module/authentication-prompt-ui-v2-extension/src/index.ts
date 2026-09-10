import { analyticsStoreContract } from '@lace-contract/analytics';
import {
  authenticationPromptStoreContract,
  authPromptUIComponentAddonContract,
  internalAuthSecretApiAddonContract,
} from '@lace-contract/authentication-prompt';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { globalOverlaysAddonContract } from '@lace-contract/views';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  authenticationPromptStoreContract,
  authPromptUIComponentAddonContract,
  globalOverlaysAddonContract,
  internalAuthSecretApiAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  authenticationPromptStoreContract,
  authPromptUIComponentAddonContract,
  analyticsStoreContract,
] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('authentication-prompt-ui-v2-extension'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadAuthenticationPromptInternalAuthSecretApiExtension: async () =>
      import('./addons/authentication-prompt-api-extension'),
    loadRenderAuthPromptUI: async () =>
      import('./addons/load-render-authentication-prompt'),
    loadGlobalOverlays: async () => import('./addons/load-global-overlays'),
  },
});

// The extension-shell guest runs on a plain web page where the extension
// internal-auth-secret addon cannot load (its chunk top-level-imports
// webextension-polyfill, which throws outside a browser extension) — and
// where it is also unnecessary: like mobile at runtime, the guest is a
// single JS context, so the in-process auth-secret bus suffices.
const guestModule = inferModuleContext({
  moduleName: ModuleName('authentication-prompt-ui-v2-extension'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadAuthenticationPromptInternalAuthSecretApiExtension: async () =>
      import('./addons/authentication-prompt-api-guest'),
    loadRenderAuthPromptUI: async () =>
      import('./addons/load-render-authentication-prompt'),
    loadGlobalOverlays: async () => import('./addons/load-global-overlays'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': multiPlatformModule,
  'lace-mobile': multiPlatformModule,
  'lace-extension-guest': guestModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof multiPlatformModule>;
export type ActionCreators = ModuleActionCreators<typeof multiPlatformModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
