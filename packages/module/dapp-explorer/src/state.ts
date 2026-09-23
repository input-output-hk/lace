import './augmentations';

import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import { customDappsStoreContract } from '@lace-contract/custom-dapps';
import { FeatureFlagKey, featureStoreContract } from '@lace-contract/feature';
import { i18nDependencyContract } from '@lace-contract/i18n';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { viewsStoreContract } from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type { LaceModuleMap } from '@lace-contract/module';

// The state-only arm of this module: the same store, feature gate and
// dependencies WITHOUT the react-native presentation addons. An addon thunk is a
// live property of the module object — nothing static can remove it — so an ESM
// bundler emits a chunk for every one of them and parses the whole react-native
// chain behind it. A DOM guest consumes this entry instead and renders its own UI
// over the same redux state. Every addon this module has is presentation, so it
// implements nothing here; the lists are restated rather than shared with
// `./index`, because `addons` is required for every contract a module implements.
const implementsContracts = combineContracts([] as const);
const dependsOnContracts = combineContracts([
  authenticationPromptStoreContract,
  customDappsStoreContract,
  viewsStoreContract,
  featureStoreContract,
  networkStoreContract,
  walletRepoStoreContract,
  i18nDependencyContract,
] as const);

const stateModule = inferModuleContext({
  moduleName: ModuleName('dapp-explorer'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FeatureFlagKey('DAPP_EXPLORER')),
    metadata: {
      name: 'Dapp Explorer Module',
      description: 'A module to handle dapp explorer center',
    },
  },
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': stateModule,
};

export default moduleMap;

// The catalogue vocabulary a DOM guest's own dApp surfaces read: which
// categories are hidden, what a category slug is called in each language, and
// the shape the fetch stores. Re-exported through this entry because it is the
// ONLY path an app may take into this package, and because all three are the
// module's own — a guest that restated them would show a category this module's
// fetch has already dropped. Type-only for `DappItem`, so zod stays out.
export { EXCLUDED_CATEGORY_SLUGS } from './const';
export { dappCategoryTranslationKeyById } from './util/text-utils';
export type { DappItem } from './types';
