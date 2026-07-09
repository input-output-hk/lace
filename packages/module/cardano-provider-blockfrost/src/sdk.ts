import './augmentations';

import {
  cardanoProviderStoreContract,
  cardanoProviderDependencyContract,
  FEATURE_FLAG_CARDANO,
} from '@lace-contract/cardano-context';
import { cryptoAddonContract } from '@lace-contract/crypto';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import '@lace-contract/feature';

import store from './store';

export default inferModuleContext({
  moduleName: ModuleName('cardano-provider-blockfrost'),
  dependsOn: combineContracts([cryptoAddonContract] as const),
  implements: combineContracts([
    cardanoProviderStoreContract,
    cardanoProviderDependencyContract,
  ] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_CARDANO),
    metadata: {
      name: 'Blockfrost',
      description: 'Blockfrost provider for Cardano',
    },
  },
  addons: {},
});

// Headless provider classes for non-Lace consumers (e.g. a Node backend).
// Tree-shakes the Redux module above when imported as named exports.
export {
  BlockfrostProvider,
  BlockfrostActivityProvider,
  BlockfrostNetworkInfoProvider,
  BlockfrostTxProvider,
  BlockfrostTxSubmitProvider,
  BlockfrostUtxoProvider,
} from './blockfrost';
export { BlockfrostToCardanoSDK } from './blockfrost/blockfrost-to-cardano-sdk';

export {
  createBlockfrostHttpClient,
  type CreateBlockfrostHttpClientProps,
} from './create-blockfrost-http-client';

export { HttpClient, isNotFoundError } from '@lace-lib/util-provider';
export type { RateLimiter } from '@lace-lib/util-provider';
