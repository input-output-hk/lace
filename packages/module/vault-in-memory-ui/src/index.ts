import { walletSettingsUICustomisationAddonContract } from '@lace-contract/account-management';
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

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
  'lace-mobile': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;

export { useRequestMnemonic } from './hooks';
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
