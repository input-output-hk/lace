import { FeatureFlagKey, featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { swapContextStoreContract } from '@lace-contract/swap-context';
import { viewsStoreContract } from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import type { LaceModuleMap } from '@lace-contract/module';

// The state-only arm of this module: the same feature gate and dependencies,
// WITHOUT the page/dialog/settings addons. Those addons are react-native
// presentation, and an addon thunk is a live property of the module object —
// nothing static can remove it — so an ESM bundler emits a chunk for every one
// of them and parses the whole react-native chain behind it. A DOM guest
// therefore consumes this entry and renders its own UI over the same redux
// state, which is why `swapContextStoreContract` stays: this module is the sole
// implementer of the swap store, so dropping it would leave the slice unmounted.
const implementsContracts = combineContracts([
  swapContextStoreContract,
] as const);

const dependsOnContracts = combineContracts([
  viewsStoreContract,
  walletRepoStoreContract,
  featureStoreContract,
] as const);

const FEATURE_FLAG_SWAP_CENTER = FeatureFlagKey('SWAP_CENTER');

const stateModule = inferModuleContext({
  moduleName: ModuleName('swap-center'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  addons: {},
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_SWAP_CENTER),
    metadata: {
      name: 'SwapCenter',
      description: 'UI for Swaps',
    },
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': stateModule,
};

export default moduleMap;

// The quote arithmetic a DOM guest's own swap UI renders. Re-exported through
// this entry because it is the ONLY path an app may take into this package: the
// maths is the module's, so a guest that restated it would drift from the
// numbers the module builds its transactions with. Pure, and free of the
// react-native chain the addons carry.
export * from './quote-math';
