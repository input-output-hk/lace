import './augmentations';

import {
  analyticsStoreContract,
  analyticsProviderDependencyContract,
} from '@lace-contract/analytics';
import { cardanoProviderStoreContract } from '@lace-contract/cardano-context';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { posthogDependencyContract } from '@lace-contract/posthog';
import { tokenPricingStoreContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import { viewsStoreContract } from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import { FEATURE_FLAG_ANALYTICS_POSTHOG } from './const';
import store from './store';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  LaceModuleMap,
} from '@lace-contract/module';

export { FEATURE_FLAG_ANALYTICS_POSTHOG } from './const';

const analyticsPosthogModule = inferModuleContext({
  moduleName: ModuleName('analytics-posthog'),
  implements: combineContracts([
    analyticsStoreContract,
    analyticsProviderDependencyContract,
  ] as const),
  dependsOn: combineContracts([
    featureStoreContract,
    posthogDependencyContract,
    walletRepoStoreContract,
    networkStoreContract,
    viewsStoreContract,
    tokenPricingStoreContract,
    tokensStoreContract,
    cardanoProviderStoreContract,
  ] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_ANALYTICS_POSTHOG),
    metadata: {
      name: 'PostHog Analytics',
      description: 'Track analytics events in PostHog',
    },
  },
  addons: {},
});

// The carbon guest runs the same store: every contract it depends on has an
// implementation there (posthog-client-web for the client, cardano-host-pull
// for the provider), and nothing in this module touches chrome.* or
// react-native.
const moduleMap: LaceModuleMap = {
  'lace-extension': analyticsPosthogModule,
  'lace-extension-carbon': analyticsPosthogModule,
  'lace-mobile': analyticsPosthogModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof analyticsPosthogModule>;
export type ActionCreators = ModuleActionCreators<
  typeof analyticsPosthogModule
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
