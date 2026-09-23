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
import { viewsStoreContract } from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import type { LaceModuleMap } from '@lace-contract/module';

// The state-only arm of this module: ONLY the recovery-phrase store (exactly-one,
// and the shared account-management screens depend on it). It registers no sheet
// pages and no wallet-settings customisation — beyond those addons being
// react-native presentation whose chunks an ESM bundler cannot drop, every screen
// behind them displays or re-enters a mnemonic, and ADR 52 requires a sandboxed
// remote guest to exclude those surfaces STRUCTURALLY: a registered route into
// one is the capture vector ADR 36 exists to close.
const implementsContracts = combineContracts([
  recoveryPhraseStoreContract,
] as const);
const dependsOnContracts = combineContracts([
  analyticsStoreContract,
  appStoreContract,
  i18nDependencyContract,
  recoveryPhraseChannelExtensionContract,
  viewsStoreContract,
  walletRepoStoreContract,
] as const);

const stateModule = inferModuleContext({
  moduleName: ModuleName('vault-in-memory-ui'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': stateModule,
};

export default moduleMap;
