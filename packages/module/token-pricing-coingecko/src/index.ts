import './augmentations';

import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { syncStoreContract } from '@lace-contract/sync';
import {
  tokenPricingStoreContract,
  tokenPricingProviderDependencyContract,
  FEATURE_FLAG_TOKEN_PRICING,
} from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';

import store from './store';

import type {
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
  LaceModuleMap,
} from '@lace-contract/module';

const tokenPricingCoinGeckoModule = inferModuleContext({
  moduleName: ModuleName('token-pricing-coingecko'),
  implements: combineContracts([
    tokenPricingStoreContract,
    tokenPricingProviderDependencyContract,
  ] as const),
  dependsOn: combineContracts([
    featureStoreContract,
    tokensStoreContract,
    syncStoreContract,
  ] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_TOKEN_PRICING),
    metadata: {
      name: 'Token Pricing (CoinGecko)',
      description: 'Fetch token prices from CoinGecko API',
    },
  },
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension': tokenPricingCoinGeckoModule,
  'lace-mobile': tokenPricingCoinGeckoModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof tokenPricingCoinGeckoModule>;
export type ActionCreators = ModuleActionCreators<
  typeof tokenPricingCoinGeckoModule
>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
