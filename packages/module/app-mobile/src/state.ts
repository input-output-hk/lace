import './augmentations';

import { accountManagementStoreContract } from '@lace-contract/account-management';
import { activitiesStoreContract } from '@lace-contract/activities';
import { addressBookStoreContract } from '@lace-contract/address-book';
import { addressesStoreContract } from '@lace-contract/addresses';
import {
  appStoreContract,
  blockchainSpecificAppCustomizationsAddonContract,
} from '@lace-contract/app';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import { customDappsStoreContract } from '@lace-contract/custom-dapps';
import { dappConnectorStoreContract } from '@lace-contract/dapp-connector';
import { failuresStoreContract } from '@lace-contract/failures';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { notificationCenterStoreContract } from '@lace-contract/notification-center';
import { onboardingStartWalletDropdownAddonContract } from '@lace-contract/onboarding-v2';
import { onlineStatusStoreContract } from '@lace-contract/online-status';
import { sendFlowStoreContract } from '@lace-contract/send-flow';
import { signerStoreContract } from '@lace-contract/signer';
import { storageDependencyContract } from '@lace-contract/storage';
import { syncStoreContract } from '@lace-contract/sync';
import { tokenPricingStoreContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import { txExecutorStoreContract } from '@lace-contract/tx-executor';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type { LaceModuleMap } from '@lace-contract/module';

// The state-only arm of this module: the same store, the same dependencies,
// WITHOUT the page/menu addons. Those addons are react-native presentation, and
// an addon thunk is a live property of the module object — nothing static can
// remove it — so an ESM bundler emits a chunk for every one of them and parses
// the whole react-native chain behind it. A DOM guest therefore cannot consume
// `./index` at all; it consumes this entry and renders its own UI over the same
// redux state.
//
// The contract lists are stated again here rather than shared with `./index`:
// sharing them would make the default entry import this file, and the two
// `implements` lists genuinely differ (the page-addon contracts are absent
// here, because `addons` is required for every contract a module implements).
// Drift fails loudly — `assertModuleCompatibility` throws at carbon's boot.
const implementsContracts = combineContracts([
  addressBookStoreContract,
  networkStoreContract,
  activitiesStoreContract,
  appStoreContract,
  failuresStoreContract,
  sendFlowStoreContract,
  tokensStoreContract,
  txExecutorStoreContract,
  walletRepoStoreContract,
  customDappsStoreContract,
  dappConnectorStoreContract,
  signerStoreContract,
  onlineStatusStoreContract,
] as const);
const dependsOnContracts = combineContracts([
  accountManagementStoreContract,
  addressesStoreContract,
  authenticationPromptStoreContract,
  blockchainSpecificAppCustomizationsAddonContract,
  cardanoProviderStoreContract,
  featureStoreContract,
  notificationCenterStoreContract,
  onboardingStartWalletDropdownAddonContract,
  storageDependencyContract,
  syncStoreContract,
  tokenPricingStoreContract,
] as const);

const stateModule = inferModuleContext({
  moduleName: ModuleName('app-mobile'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': stateModule,
};

export default moduleMap;
