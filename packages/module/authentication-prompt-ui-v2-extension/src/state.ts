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

import store from './store';

import type { LaceModuleMap } from '@lace-contract/module';

// The state-only arm of this module: the same store and dependencies WITHOUT the
// react-native presentation addons (auth-prompt UI, global overlays). An addon
// thunk is a live property of the module object — nothing static can remove it —
// so an ESM bundler emits a chunk for every one of them and parses the whole
// react-native chain behind it. A DOM guest consumes this entry instead and
// renders its own UI over the same redux state. The internal-auth-secret addon
// survives: it is pure logic and its contract is exactly-one. The contract lists
// are restated rather than shared with `./index`, because `addons` is required
// for every contract a module implements — the two lists genuinely differ.
const implementsContracts = combineContracts([
  authenticationPromptStoreContract,
  internalAuthSecretApiAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  authenticationPromptStoreContract,
  authPromptUIComponentAddonContract,
  analyticsStoreContract,
] as const);

const stateModule = inferModuleContext({
  moduleName: ModuleName('authentication-prompt-ui-v2-extension'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadAuthenticationPromptInternalAuthSecretApiExtension: async () =>
      import('./addons/authentication-prompt-api-guest'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': stateModule,
};

export default moduleMap;
