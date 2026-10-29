import './augmentations';

import {
  BITCOIN_FEATURE_FLAG,
  bitcoinProviderContract,
} from '@lace-contract/bitcoin-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';

import store from './store';

/**
 * Bitcoin chain data through Maestro: UTxOs, transactions and fee estimates.
 * Loads when `BITCOIN_FEATURE_FLAG` is enabled.
 */
export default inferModuleContext({
  moduleName: ModuleName('bitcoin-provider-maestro'),
  dependsOn: combineContracts([] as const),
  implements: combineContracts([bitcoinProviderContract] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === BITCOIN_FEATURE_FLAG),
    metadata: {
      name: 'Maestro',
      description: 'Maestro provider for Bitcoin',
    },
  },
  addons: {},
});
