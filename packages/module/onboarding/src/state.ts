import { analyticsStoreContract } from '@lace-contract/analytics';
import {
  authenticationPromptStoreContract,
  internalAuthSecretApiAddonContract,
} from '@lace-contract/authentication-prompt/src/contract';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  onboardingOptionsAddonContract,
  onboardingV2StoreContract,
} from '@lace-contract/onboarding-v2';
import {
  vaultCapabilitiesAddonContract,
  vaultCeremonyStoreContract,
  vaultContract,
} from '@lace-contract/vault';
import { viewsStoreContract } from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type { LaceModuleMap } from '@lace-contract/module';

// The state-only arm of this module: the same store, the same dependencies,
// WITHOUT the stack-page addon. That addon is react-native presentation, and an
// addon thunk is a live property of the module object — nothing static can remove
// it — so an ESM bundler emits a chunk for it and parses the whole react-native
// chain behind it. A DOM guest therefore cannot consume `./index` at all; it
// consumes this entry and renders its own UI over the same redux state.
//
// The contract lists are stated again here rather than shared with `./index`:
// sharing them would make the default entry import this file, and the two
// `implements` lists genuinely differ (the page-addon contracts are absent here,
// because `addons` is required for every contract a module implements).
// Drift fails loudly — `assertModuleCompatibility` throws at carbon's boot.
const implementsContracts = combineContracts([
  onboardingV2StoreContract,
] as const);
const dependsOnContracts = combineContracts([
  vaultContract,
  vaultCeremonyStoreContract,
  vaultCapabilitiesAddonContract,
  viewsStoreContract,
  analyticsStoreContract,
  walletRepoStoreContract,
  authenticationPromptStoreContract,
  internalAuthSecretApiAddonContract,
  onboardingOptionsAddonContract,
] as const);

const stateModule = inferModuleContext({
  moduleName: ModuleName('onboarding'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': stateModule,
};

export default moduleMap;
