import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import {
  BITCOIN_FEATURE_FLAG,
  BitcoinTransactionStatus,
  bitcoinProviderContract,
  type BitcoinProvider,
  type BitcoinProviderDependencies,
} from '@lace-contract/bitcoin-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { Err, Ok } from '@lace-sdk/util';
import { of } from 'rxjs';

import type { LaceModuleMap } from '@lace-contract/module';

const stubBitcoinProvider: BitcoinProvider = {
  getLastKnownBlock: () =>
    of(Ok({ height: 0, hash: 'stub-bitcoin-block-hash' })),
  getTransaction: () =>
    of(
      Err(
        new ProviderError(
          ProviderFailure.NotFound,
          undefined,
          'Stub implementation',
        ),
      ),
    ),
  getTransactions: () => of(Ok({ items: [], cursor: '' })),
  getTransactionsInMempool: () => of(Ok({ items: [], cursor: '' })),
  getUTxOs: () => of(Ok({ items: [], cursor: '' })),
  submitTransaction: () => of(Ok('stub-bitcoin-tx-id')),
  getTransactionStatus: () => of(Ok(BitcoinTransactionStatus.Confirmed)),
  estimateFee: () => of(Ok({ feeRate: 1, targetConfirmationTime: 600 })),
};

const store = {
  context: {
    actions: {},
    selectors: {},
  },
  load: async () => ({
    default: async () => ({
      sideEffectDependencies: {
        bitcoinProvider: stubBitcoinProvider,
      } as BitcoinProviderDependencies,
    }),
  }),
};

const sharedModule = inferModuleContext({
  moduleName: ModuleName('bitcoin-provider-maestro'),
  dependsOn: combineContracts([] as const),
  implements: combineContracts([bitcoinProviderContract] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === BITCOIN_FEATURE_FLAG),
    metadata: {
      name: 'Maestro (Stub)',
      description: 'Stub Maestro Bitcoin provider for Storybook',
    },
  },
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': sharedModule,
};

export const stubBitcoinProviderMaestroModule = moduleMap;
