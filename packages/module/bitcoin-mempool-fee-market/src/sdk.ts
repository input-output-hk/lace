import {
  BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG,
  bitcoinFeeMarketProvider,
} from '@lace-contract/bitcoin-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';

import store from './store';

/**
 * Bitcoin fee rate estimates from mempool.space. Loads when
 * `BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG` is enabled.
 */
export default inferModuleContext({
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
      name: 'Mempool.space fee market provider',
      description: 'Mempool.space fee market provider for Bitcoin',
    },
  },
  addons: {},
});
