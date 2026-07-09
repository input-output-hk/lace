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
import { searchHWDevicesAddonContract } from '@lace-contract/wallet-repo';

import { FEATURE_FLAG_LEDGER } from './const';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  LaceModuleMap,
  ModuleAddons,
  LaceModule,
} from '@lace-contract/module';

export { FEATURE_FLAG_LEDGER } from './const';

const sharedImplementsContracts = [
  onboardingOptionsAddonContract,
  signerFactoryAddonContract,
  hwWalletConnectorAddonContract,
  hwBlockchainSupportAddonContract,
  ledgerHwAccountConnectorAddonContract,
] as const;

const sharedModuleParts = {
  moduleName: ModuleName('vault-ledger'),
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_LEDGER),
    metadata: {
      name: 'Ledger',
      description: 'Ledger hardware wallets support',
    },
  },
} as const satisfies Partial<LaceModule>;

const extensionImplementsContracts = combineContracts([
  ...sharedImplementsContracts,
] as const);
const extensionDependsOnContracts = combineContracts([] as const);

const extensionModule = inferModuleContext({
  ...sharedModuleParts,
  implements: extensionImplementsContracts,
  dependsOn: extensionDependsOnContracts,
  addons: {
    loadOnboardingOptions: async () => import('./addons/onboarding-options'),
    loadSignerFactory: async () => import('./addons/signer-factory-web'),
    loadHwWalletConnector: async () =>
      import('./addons/hw-wallet-connector-web'),
    loadLedgerHwAccountConnector: async () =>
      import('./addons/hw-account-connector-web'),
    loadHwBlockchainSupport: async () => import('./hw-blockchain-support'),
  },
});

const mobileImplementsContracts = combineContracts([
  ...sharedImplementsContracts,
  searchHWDevicesAddonContract,
] as const);
const mobileDependsOnContracts = combineContracts([] as const);

const mobileModule = inferModuleContext({
  ...sharedModuleParts,
  implements: mobileImplementsContracts,
  dependsOn: mobileDependsOnContracts,
  addons: {
    loadOnboardingOptions: async () => import('./addons/onboarding-options'),
    loadSignerFactory: async () => import('./addons/signer-factory-mobile'),
    loadHwWalletConnector: async () =>
      import('./addons/hw-wallet-connector-mobile'),
    loadLedgerHwAccountConnector: async () =>
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
  typeof extensionDependsOnContracts
>;
