import { inferModuleContext, ModuleName } from '@lace-contract/module';

import { FEATURE_FLAG_MIDNIGHT } from './const';
import { dependsOnContracts, implementsContracts } from './context';
import store from './store';

import type { LaceModuleMap } from '@lace-contract/module';

const extensionModule = inferModuleContext({
  moduleName: ModuleName('midnight-sync'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_MIDNIGHT),
    metadata: {
      name: 'MidnightSync',
      description: 'Midnight engine, wallet lifecycle, tx executor and signer',
    },
  },
  addons: {
    loadTxExecutorImplementation: async () =>
      import('./exported-modules/tx-executor-implementation'),
    loadSignerFactory: async () => import('./exported-modules/signer-factory'),
    loadInMemoryWalletIntegration: async () =>
      import('./exported-modules/in-memory-wallet-integration').then(
        module => ({ default: module.inMemoryWalletIntegrationReactNative }),
      ),
  },
});

// Monolith-only, unlike the UI module (@lace-module/blockchain-midnight, which
// also registers 'lace-mobile' and 'lace-extension-guest'): this module IS the
// engine, and mobile Midnight is off by design while the guest pulls its state
// from the host (@lace-module/midnight-host-pull). Re-enabling Midnight on
// mobile therefore means adding 'lace-mobile' HERE too — the UI module alone
// would ship a surface with no engine behind it.
const moduleMap: LaceModuleMap = {
  'lace-extension': extensionModule,
};

export default moduleMap;

export type { ActionCreators, Selectors, SideEffect } from './context';
