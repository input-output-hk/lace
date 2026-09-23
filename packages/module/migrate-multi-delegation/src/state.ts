import './augmentations';

import { addressesStoreContract } from '@lace-contract/addresses';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { signerStoreContract } from '@lace-contract/signer';

import { MD_MIGRATION_FEATURE_FLAG } from './const';
import store from './store';

import type { LaceModuleMap } from '@lace-contract/module';

// The state-only arm of this module: the same store, the same dependencies,
// WITHOUT the global-overlay addon. That addon is react-native presentation, and
// an addon thunk is a live property of the module object — nothing static can
// remove it — so an ESM bundler emits a chunk for it and parses the whole
// react-native chain behind it. A DOM guest therefore cannot consume `./index` at
// all; it consumes this entry and renders its own UI over the same redux state.
//
// The contract lists are stated again here rather than shared with `./index`:
// sharing them would make the default entry import this file, and the two
// `implements` lists genuinely differ (the page-addon contracts are absent here,
// because `addons` is required for every contract a module implements).
// Drift fails loudly — `assertModuleCompatibility` throws at carbon's boot.
const implementsContracts = combineContracts([]);
const dependsOnContracts = combineContracts([
  authenticationPromptStoreContract,
  addressesStoreContract,
  cardanoProviderStoreContract,
  signerStoreContract,
] as const);

const stateModule = inferModuleContext({
  moduleName: ModuleName('migrate-multi-delegation'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  addons: {},
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === MD_MIGRATION_FEATURE_FLAG),
    metadata: {
      name: 'migrate-multi-delegation',
      description: 'Lace multi-delegation->single-delegation migration',
    },
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': stateModule,
};

export default moduleMap;
