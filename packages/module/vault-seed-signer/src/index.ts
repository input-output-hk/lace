import { airGappedQrExchangeStoreContract } from '@lace-contract/air-gapped-qr-exchange';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  hwBlockchainSupportAddonContract,
  hwWalletConnectorAddonContract,
  onboardingOptionsAddonContract,
} from '@lace-contract/onboarding-v2';
import { signerFactoryAddonContract } from '@lace-contract/signer';

import { FEATURE_FLAG_SEED_SIGNER } from './const';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  LaceModuleMap,
  ModuleAddons,
} from '@lace-contract/module';

export { FEATURE_FLAG_SEED_SIGNER } from './const';

const implementsContracts = combineContracts([
  onboardingOptionsAddonContract,
  signerFactoryAddonContract,
  hwWalletConnectorAddonContract,
  hwBlockchainSupportAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  airGappedQrExchangeStoreContract,
] as const);

const multiPlatformModule = inferModuleContext({
  moduleName: ModuleName('vault-seed-signer'),
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_SEED_SIGNER),
    metadata: {
      name: 'Seed Signer',
      description: 'Air-gapped Seed Signer support (Cardano and Bitcoin)',
    },
  },
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  addons: {
    loadOnboardingOptions: async () => import('./addons/onboarding-options'),
    loadSignerFactory: async () => import('./addons/signer-factory'),
    loadHwWalletConnector: async () => import('./addons/hw-wallet-connector'),
    loadHwBlockchainSupport: async () =>
      import('./addons/hw-blockchain-support'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': multiPlatformModule,
  'lace-mobile': multiPlatformModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof multiPlatformModule>;
export type ActionCreators = ModuleActionCreators<typeof multiPlatformModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
