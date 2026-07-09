import {
  BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG,
  bitcoinFeeMarketProvider,
  type BitcoinFeeMarketProvider,
  type BitcoinFeeMarketProviderDependencies,
} from '@lace-contract/bitcoin-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { Ok } from '@lace-sdk/util';
import { of } from 'rxjs';

import type { LaceModuleMap } from '@lace-contract/module';

const stubBitcoinFeeMarketProvider: BitcoinFeeMarketProvider = {
  getFeeMarket: () =>
    of(
      Ok({
        fast: { feeRate: 5, targetConfirmationTime: 600 },
        standard: { feeRate: 2, targetConfirmationTime: 1800 },
        slow: { feeRate: 1, targetConfirmationTime: 3600 },
      }),
    ),
};

const store = {
  context: {
    actions: {},
    selectors: {},
  },
  load: async () => ({
    default: async () => ({
      sideEffectDependencies: {
        bitcoinFeeMarketProvider: stubBitcoinFeeMarketProvider,
      } as BitcoinFeeMarketProviderDependencies,
    }),
  }),
};

const sharedModule = inferModuleContext({
  moduleName: ModuleName('bitcoin-mempool-fee-market'),
  dependsOn: combineContracts([] as const),
  implements: combineContracts([bitcoinFeeMarketProvider] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(
        flag => flag.key === BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG,
      ),
    metadata: {
      name: 'Mempool.space Fee Market (Stub)',
      description: 'Stub Mempool.space fee market provider for Storybook',
    },
  },
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': sharedModule,
};

export const stubBitcoinMempoolFeeMarketModule = moduleMap;
