import './augmentations';

import { accountManagementStoreContract } from '@lace-contract/account-management';
import { addressesStoreContract } from '@lace-contract/addresses';
import { analyticsStoreContract } from '@lace-contract/analytics';
import { appStoreContract } from '@lace-contract/app';
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  onboardingEntryAddonContract,
  onboardingOptionsAddonContract,
} from '@lace-contract/onboarding-v2';
import { recoveryPhraseStoreContract } from '@lace-contract/recovery-phrase';
import { secureStoreContract } from '@lace-contract/secure-store';
import { tokensStoreContract } from '@lace-contract/tokens';
import {
  vaultCapabilitiesAddonContract,
  vaultCeremonyStoreContract,
  vaultContract,
} from '@lace-contract/vault';
import { viewsStoreContract } from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import { FEATURE_FLAG_ACCOUNT_MANAGEMENT } from './constants';
import store from './store';

import type { LaceModuleMap } from '@lace-contract/module';

// The state-only arm of this module: the same store and dependencies, without
// the page addons. Those addons are react-native presentation, and an addon
// thunk is a live property of the module object, so an ESM bundler emits a
// chunk per addon and parses the react-native chain behind it — a DOM guest
// cannot consume `./index` at all, and takes this entry instead to render its
// own UI over the same redux state. The contract lists are stated again rather
// than shared: sharing would make `./index` import this file, and `implements`
// must shed every contract whose addon is gone, since `addons` is required for
// each contract a module implements.
const implementsContracts = combineContracts([
  accountManagementStoreContract,
] as const);
const dependsOnContracts = combineContracts([
  appStoreContract,
  cardanoProviderStoreContract,
  viewsStoreContract,
  featureStoreContract,
  vaultContract,
  vaultCeremonyStoreContract,
  vaultCapabilitiesAddonContract,
  walletRepoStoreContract,
  tokensStoreContract,
  addressesStoreContract,
  recoveryPhraseStoreContract,
  secureStoreContract,
  onboardingOptionsAddonContract,
  onboardingEntryAddonContract,
  analyticsStoreContract,
] as const);

const stateModule = inferModuleContext({
  moduleName: ModuleName('account-management'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_ACCOUNT_MANAGEMENT),
    metadata: {
      name: 'Account Management Module',
      description: 'A module to handle account management features',
    },
  },
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': stateModule,
};

export default moduleMap;
