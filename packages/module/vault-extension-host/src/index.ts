import { walletSettingsUICustomisationAddonContract } from '@lace-contract/account-management';
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

import type {
  LaceModuleMap,
  LaceSideEffect,
  ModuleActionCreators,
  ModuleAddons,
  ModuleSelectors,
} from '@lace-contract/module';

// Guest-only ceremony proxy (ADR 52): the shared wallet-ceremony actions route
// here to the host's `window.lace` surfaces (ADR 36 — every secret input is
// typed inside the host, never in this sandboxed remote guest), and the vault
// capabilities are derived from what the host advertises. Its one rendered
// surface is the wallet-settings "Show recovery phrase" row, which merely
// dispatches the reveal ceremony — the phrase itself never enters the guest. No
// feature gate: the shared onboarding/account-management screens always depend
// on the ceremony/capabilities contracts, so this sole guest implementer must
// always load.
const implementsContracts = combineContracts([
  vaultCeremonyStoreContract,
  vaultCapabilitiesAddonContract,
  walletSettingsUICustomisationAddonContract,
] as const);
// No wallet-repo store dependency: this arm neither reads nor writes the repo —
// the host vault is authoritative and `cardano-host-pull` owns the projection.
// (`WalletType` is imported as a plain package value by the settings row; that
// is not a store edge.)
const dependsOnContracts = combineContracts([
  failuresStoreContract,
  i18nDependencyContract,
  networkStoreContract,
] as const);

const guestModule = inferModuleContext({
  moduleName: ModuleName('vault-extension-host'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {
    loadVaultCapabilities: async () => import('./addons/vaultCapabilities'),
    loadWalletSettingsUICustomisations: async () =>
      import('./addons/walletSettingsUI'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension-guest': guestModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof guestModule>;
export type ActionCreators = ModuleActionCreators<typeof guestModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
