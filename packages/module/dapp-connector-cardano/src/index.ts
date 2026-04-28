import './augmentations';

import { addressBookStoreContract } from '@lace-contract/address-book';
import { addressesStoreContract } from '@lace-contract/addresses';
import { analyticsStoreContract } from '@lace-contract/analytics';
import { appLockStoreContract } from '@lace-contract/app-lock';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import {
  dappConnectorApiAddonContract,
  dappConnectorPlatformDependencyContract,
  dappConnectorStoreContract,
} from '@lace-contract/dapp-connector';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { signerStoreContract } from '@lace-contract/signer';
import { tokenPricingStoreContract } from '@lace-contract/token-pricing';
import {
  renderRootAddonContract,
  viewsStoreContract,
  sheetPagesAddonContract,
  stackPagesAddonContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import { cardanoDappConnectorApi } from './browser/cardano-dapp-connector-api';
import extensionStore from './browser/store';
import { FEATURE_FLAG_CARDANO_DAPP_CONNECTOR } from './common/const';
import mobileStore from './mobile/store';

import type {
  LaceModuleMap,
  LaceSideEffect,
  ModuleActionCreators,
  ModuleAddons,
  ModuleSelectors,
} from '@lace-contract/module';

export { FEATURE_FLAG_CARDANO_DAPP_CONNECTOR } from './common/const';

const _implementsContracts = combineContracts([
  dappConnectorApiAddonContract,
  sheetPagesAddonContract,
  stackPagesAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  addressBookStoreContract,
  addressesStoreContract,
  analyticsStoreContract,
  appLockStoreContract,
  featureStoreContract,
  cardanoProviderStoreContract,
  authenticationPromptStoreContract,
  viewsStoreContract,
  walletRepoStoreContract,
  dappConnectorStoreContract,
  networkStoreContract,
  signerStoreContract,
  tokenPricingStoreContract,
] as const);

const mobileImplementsContracts = combineContracts([
  dappConnectorPlatformDependencyContract,
  sheetPagesAddonContract,
  stackPagesAddonContract,
] as const);

const mobileModule = inferModuleContext({
  moduleName: ModuleName('cardano-dapp-connector'),
  implements: mobileImplementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    willLoad: featureFlags => {
      return featureFlags.some(
        flag => flag.key === FEATURE_FLAG_CARDANO_DAPP_CONNECTOR,
      );
    },
    metadata: {
      name: 'CardanoDappConnector',
      description: 'Cardano blockchain dapp connector support (mobile)',
    },
  },
  store: mobileStore,
  addons: {
    loadSheetPages: async () => import('./mobile/addons/sheetPages'),
    loadStackPages: async () => import('./mobile/addons/stackPages'),
  },
});

const extensionImplementsContracts = combineContracts([
  dappConnectorApiAddonContract,
  renderRootAddonContract,
  sheetPagesAddonContract,
] as const);

const extensionModule = inferModuleContext({
  moduleName: ModuleName('cardano-dapp-connector'),
  implements: extensionImplementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    willLoad: featureFlags => {
      return featureFlags.some(
        flag => flag.key === FEATURE_FLAG_CARDANO_DAPP_CONNECTOR,
      );
    },
    metadata: {
      name: 'CardanoDappConnector',
      description: 'Cardano blockchain dapp connector support (extension)',
    },
  },
  store: extensionStore,
  addons: {
    dappConnectorApi: cardanoDappConnectorApi,
    renderRoot: {
      sidePanel: async () => import('./browser/addons/renderRoot'),
      popupWindow: async () => import('./browser/addons/renderRoot'),
    },
    loadSheetPages: async () => import('./browser/addons/sheetPages'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': mobileModule,
  'lace-extension': extensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof mobileModule>;
export type ActionCreators = ModuleActionCreators<typeof mobileModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof _implementsContracts,
  typeof dependsOnContracts
>;
