import { featureStoreContract } from '@lace-contract/feature';
import { i18nDependencyContract } from '@lace-contract/i18n';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  hwBlockchainSupportAddonContract,
  trezorHwAccountConnectorAddonContract,
  hwWalletConnectorAddonContract,
  onboardingOptionsAddonContract,
} from '@lace-contract/onboarding-v2';
import { signerFactoryAddonContract } from '@lace-contract/signer';
import {
  searchHWDevicesAddonContract,
  vaultContract,
  walletRepoStoreContract,
} from '@lace-contract/wallet-repo';

import { FEATURE_FLAG_TREZOR } from './const';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  LaceModuleMap,
  ModuleAddons,
  LaceModule,
} from '@lace-contract/module';

export { FEATURE_FLAG_TREZOR } from './const';

const sharedImplementsContracts = [
  onboardingOptionsAddonContract,
  signerFactoryAddonContract,
  hwWalletConnectorAddonContract,
  hwBlockchainSupportAddonContract,
  trezorHwAccountConnectorAddonContract,
] as const;

const sharedDependsOnContracts = [
  i18nDependencyContract,
  featureStoreContract,
  walletRepoStoreContract,
] as const;

const sharedModuleParts = {
  moduleName: ModuleName('vault-trezor'),
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_TREZOR),
    metadata: {
      name: 'Trezor',
      description: 'Trezor hardware wallets support',
    },
  },
} as const satisfies Partial<LaceModule>;

const extensionImplementsContracts = combineContracts([
  vaultContract,
  ...sharedImplementsContracts,
] as const);
const dependsOnContracts = combineContracts([
  ...sharedDependsOnContracts,
] as const);

const extensionModule = inferModuleContext({
  ...sharedModuleParts,
  implements: extensionImplementsContracts,
  dependsOn: dependsOnContracts,
  addons: {
    loadOnboardingOptions: async () => import('./addons/onboarding-options'),
    loadSignerFactory: async () => import('./addons/signer-factory-web'),
    loadHwWalletConnector: async () =>
      import('./addons/hw-wallet-connector-web'),
    loadTrezorHwAccountConnector: async () =>
      import('./addons/hw-account-connector-web'),
    loadHwBlockchainSupport: async () => import('./hw-blockchain-support'),
  },
});

const mobileImplementsContracts = combineContracts([
  vaultContract,
  ...sharedImplementsContracts,
  searchHWDevicesAddonContract,
] as const);

const mobileModule = inferModuleContext({
  ...sharedModuleParts,
  implements: mobileImplementsContracts,
  dependsOn: dependsOnContracts,
  addons: {
    loadOnboardingOptions: async () => import('./addons/onboarding-options'),
    loadSignerFactory: async () => import('./addons/signer-factory-mobile'),
    loadHwWalletConnector: async () =>
      import('./addons/hw-wallet-connector-mobile'),
    loadTrezorHwAccountConnector: async () =>
      import('./addons/hw-account-connector-mobile'),
    loadHwBlockchainSupport: async () => import('./hw-blockchain-support'),
    loadSearchHWDevices: async () =>
      import('./addons/search-hw-devices-mobile'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
  'lace-mobile': mobileModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof extensionModule>;
export type ActionCreators = ModuleActionCreators<typeof extensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof extensionImplementsContracts,
  typeof dependsOnContracts
>;
export type AvailableMobileAddons = ModuleAddons<
  typeof mobileImplementsContracts,
  typeof dependsOnContracts
>;
