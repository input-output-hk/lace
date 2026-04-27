import { featureStoreContract } from '@lace-contract/feature';
import { i18nDependencyContract } from '@lace-contract/i18n';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  hwBlockchainSupportAddonContract,
  ledgerHwAccountConnectorAddonContract,
  hwWalletConnectorAddonContract,
  onboardingOptionsAddonContract,
} from '@lace-contract/onboarding-v2';
import { signerFactoryAddonContract } from '@lace-contract/signer';
import {
  vaultContract,
  walletRepoStoreContract,
} from '@lace-contract/wallet-repo';

import { FEATURE_FLAG_LEDGER } from './const';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  LaceModuleMap,
  ModuleAddons,
} from '@lace-contract/module';

export { FEATURE_FLAG_LEDGER } from './const';

const implementsContracts = combineContracts([
  vaultContract,
  onboardingOptionsAddonContract,
  signerFactoryAddonContract,
  hwWalletConnectorAddonContract,
  hwBlockchainSupportAddonContract,
  ledgerHwAccountConnectorAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  i18nDependencyContract,
  featureStoreContract,
  walletRepoStoreContract,
] as const);

const extensionModule = inferModuleContext({
  moduleName: ModuleName('vault-ledger'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_LEDGER),
    metadata: {
      name: 'Ledger',
      description: 'Ledger hardware wallets support',
    },
  },
  addons: {
    loadOnboardingOptions: async () => import('./onboarding-options'),
    loadSignerFactory: async () => import('./exposed-modules/signer-factory'),
    loadHwWalletConnector: async () => import('./hw-wallet-connector'),
    loadLedgerHwAccountConnector: async () => import('./hw-account-connector'),
    loadHwBlockchainSupport: async () => import('./hw-blockchain-support'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
