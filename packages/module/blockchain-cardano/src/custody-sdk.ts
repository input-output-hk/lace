import { FEATURE_FLAG_CARDANO } from '@lace-contract/cardano-context';
import {
  inferModuleContext,
  inferStoreContext,
  ModuleName,
} from '@lace-contract/module';

import {
  custodyDependsOnContracts,
  custodyImplementsContracts,
} from './custody-contracts';

import type { CustodyModule } from './custody-contracts';

/**
 * Cardano custody accounts: builds their transactions and probes for free
 * creator indexes, answering the `cardanoCustody` actions, and tracks their
 * tokens. Loads when `FEATURE_FLAG_CARDANO` is enabled, next to
 * `m.blockchainCardano`.
 */
const custodyModule: CustodyModule = inferModuleContext({
  moduleName: ModuleName('blockchain-cardano-custody'),
  implements: custodyImplementsContracts,
  dependsOn: custodyDependsOnContracts,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_CARDANO),
    metadata: {
      name: 'Cardano custody accounts',
      description: 'Cardano custody account transactions',
    },
  },
  store: inferStoreContext({
    load: async () => import('./store/custody/init'),
    context: { actions: {}, selectors: {} },
  }),
  addons: {},
});

export default custodyModule;
