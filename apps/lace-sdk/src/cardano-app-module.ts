import {
  appStoreContract,
  performAppReloadDependencyContract,
} from '@lace-contract/app';
import { FEATURE_FLAG_CARDANO } from '@lace-contract/cardano-context';
import { FeatureFlagKey } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { viewsStoreContract } from '@lace-contract/views';

import store from './cardano-app-module-store';

/**
 * The key of the flag that enables Bitcoin accounts. Spelled out here rather
 * than imported from the Bitcoin contract, which is canary code that neither
 * the stable build nor the Cardano entry may carry (ADR 66).
 */
const BITCOIN_FEATURE_FLAG_KEY = FeatureFlagKey('BLOCKCHAIN_BITCOIN');

/**
 * The app-shell contracts the blockchain modules need, such as the analytics
 * store that failures report to, implemented headless. `createLaceWallet`
 * loads it whenever the Cardano or Bitcoin feature flag is on.
 */
export const sdkCardanoAppModule = inferModuleContext({
  moduleName: ModuleName('lace-sdk-cardano-app'),
  implements: combineContracts([
    appStoreContract,
    viewsStoreContract,
    performAppReloadDependencyContract,
  ] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(
        flag =>
          flag.key === FEATURE_FLAG_CARDANO ||
          flag.key === BITCOIN_FEATURE_FLAG_KEY,
      ),
    metadata: {
      name: 'SdkCardanoApp',
      description: 'Headless app contracts of the blockchain modules',
    },
  },
  addons: {},
});
