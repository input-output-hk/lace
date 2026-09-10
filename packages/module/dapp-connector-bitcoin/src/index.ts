import './augmentations';

import { activitiesStoreContract } from '@lace-contract/activities';
import { addressesStoreContract } from '@lace-contract/addresses';
import { appLockStoreContract } from '@lace-contract/app-lock';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import { bitcoinProviderContract } from '@lace-contract/bitcoin-context';
import {
  dappConnectorApiAddonContract,
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
import { tokensStoreContract } from '@lace-contract/tokens';
import { txExecutorStoreContract } from '@lace-contract/tx-executor';
import {
  renderRootAddonContract,
  sheetPagesAddonContract,
  viewsStoreContract,
} from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import { FEATURE_FLAG_BITCOIN_DAPP_CONNECTOR } from './const';
import { dappConnectorApi } from './dapp-connector-api';
import laceExtensionStore from './store/lace-extension-store';

import type {
  LaceModuleMap,
  LaceSideEffect,
  ModuleActionCreators,
  ModuleAddons,
  ModuleSelectors,
} from '@lace-contract/module';

export { FEATURE_FLAG_BITCOIN_DAPP_CONNECTOR } from './const';

const implementsContracts = combineContracts([
  dappConnectorApiAddonContract,
  renderRootAddonContract,
  sheetPagesAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  activitiesStoreContract,
  addressesStoreContract,
  appLockStoreContract,
  authenticationPromptStoreContract,
  bitcoinProviderContract,
  dappConnectorStoreContract,
  featureStoreContract,
  networkStoreContract,
  signerStoreContract,
  tokensStoreContract,
  txExecutorStoreContract,
  viewsStoreContract,
  walletRepoStoreContract,
] as const);

const willLoad = (featureFlags: ReadonlyArray<{ key: string }>) =>
  featureFlags.some(flag => flag.key === FEATURE_FLAG_BITCOIN_DAPP_CONNECTOR);

const laceExtensionModule = inferModuleContext({
  moduleName: ModuleName('bitcoin-dapp-connector'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    willLoad,
    metadata: {
      name: 'BitcoinDappConnector',
      description: 'Bitcoin blockchain dapp connector support',
    },
  },
  store: laceExtensionStore,
  addons: {
    dappConnectorApi,
    renderRoot: {
      sidePanel: async () => import('./addons/renderRoot'),
      popupWindow: async () => import('./addons/renderRoot'),
    },
    loadSheetPages: async () => import('./addons/sheetPages'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension': laceExtensionModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof laceExtensionModule>;
export type ActionCreators = ModuleActionCreators<typeof laceExtensionModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type AvailableAddons = ModuleAddons<
  typeof implementsContracts,
  typeof dependsOnContracts
>;
