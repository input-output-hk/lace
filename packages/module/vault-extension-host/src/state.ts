import { failuresStoreContract } from '@lace-contract/failures';
import { i18nDependencyContract } from '@lace-contract/i18n';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import {
  vaultCapabilitiesAddonContract,
  vaultCeremonyStoreContract,
} from '@lace-contract/vault';

import store from './store';

import type { LaceModuleMap } from '@lace-contract/module';

// The state-only arm of this module: the same ceremony store and the vault
// capabilities addon, WITHOUT the wallet-settings customisation. That addon is
// react-native presentation, and an addon thunk is a live property of the module
// object — nothing static can remove it — so an ESM bundler emits a chunk for it
// and parses the whole react-native chain behind it. `loadVaultCapabilities` is
// pure logic and stays: its contract is exactly-one and this is the only guest
// implementer. The contract lists are stated again rather than shared with
// `./index`, because `addons` is required for every contract a module implements
// and the two `implements` lists therefore genuinely differ.
const implementsContracts = combineContracts([
  vaultCeremonyStoreContract,
  vaultCapabilitiesAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  failuresStoreContract,
  i18nDependencyContract,
  networkStoreContract,
] as const);

const stateModule = inferModuleContext({
  moduleName: ModuleName('vault-extension-host'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadVaultCapabilities: async () => import('./addons/vaultCapabilities'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': stateModule,
};

export default moduleMap;
