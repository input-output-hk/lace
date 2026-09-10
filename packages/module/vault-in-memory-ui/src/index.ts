import { walletSettingsUICustomisationAddonContract } from '@lace-contract/account-management';
import { analyticsStoreContract } from '@lace-contract/analytics';
import { appStoreContract } from '@lace-contract/app';
import { i18nDependencyContract } from '@lace-contract/i18n';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  recoveryPhraseStoreContract,
  recoveryPhraseChannelExtensionContract,
} from '@lace-contract/recovery-phrase';
import {
  sheetPagesAddonContract,
  viewsStoreContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import type {
  ModuleSelectors,
  LaceModuleMap,
  ModuleActionCreators,
  ModuleAddons,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  walletSettingsUICustomisationAddonContract,
  recoveryPhraseStoreContract,
  sheetPagesAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  analyticsStoreContract,
  appStoreContract,
  i18nDependencyContract,
  recoveryPhraseChannelExtensionContract,
  viewsStoreContract,
  walletRepoStoreContract,
] as const);

const extensionModule = inferModuleContext({
  moduleName: ModuleName('vault-in-memory-ui'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  addons: {
    loadWalletSettingsUICustomisations: async () =>
      import('./wallet-settings-ui'),
    loadSheetPages: async () => import('./addons/sheetPages'),
  },
});

// The guest keeps ONLY the recovery-phrase store (exactly-one, and the shared
// account-management screens depend on it). It registers NO sheet pages: every
// screen in `./addons/sheetPages` displays or re-enters a mnemonic, and ADR 52
// requires the sandboxed remote guest to exclude those surfaces STRUCTURALLY —
// a registered route into one is the capture vector ADR 36 exists to close.
// Both guest entry points are host ceremonies instead: the wallet-settings
// "Show recovery phrase" row is vault-extension-host's customisation, and a
// host-projected shell never carries `encryptedRecoveryPhrase`, so the
// passphrase-verification card never renders.
const guestImplementsContracts = combineContracts([
  recoveryPhraseStoreContract,
] as const);

const guestModule = inferModuleContext({
  moduleName: ModuleName('vault-in-memory-ui'),
  implements: guestImplementsContracts,
  dependsOn: dependsOnContracts,
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
  'lace-mobile': extensionModule,
  'lace-extension-guest': guestModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;

export { useRequestMnemonic } from './hooks';
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
