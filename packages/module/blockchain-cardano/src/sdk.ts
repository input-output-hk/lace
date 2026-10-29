import { FEATURE_FLAG_CARDANO } from '@lace-contract/cardano-context';
import { inferModuleContext, ModuleName } from '@lace-contract/module';

import { dependsOnContracts, implementsContracts } from './sdk-contracts';
import store from './store';

export { createLazyAccountsFromAccountPublicKey } from './in-memory-wallet-integration';

/**
 * Cardano accounts: their addresses, tokens and sync, signing, and the
 * transaction builders for delegation, voting and rewards. Loads when
 * `FEATURE_FLAG_CARDANO` is enabled, and needs a Cardano provider module such
 * as `m.cardanoProviderBlockfrost`.
 */
export default inferModuleContext({
  moduleName: ModuleName('blockchain-cardano'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_CARDANO),
    metadata: {
      name: 'Cardano',
      description: 'Cardano blockchain support',
    },
  },
  store,
  addons: {
    loadInMemoryWalletIntegration: async () =>
      import('./in-memory-wallet-integration'),
    loadAddressBookAddressValidators: async () =>
      import('./exposed-modules/address-book-address-validator'),
    loadDelegationTxBuilder: async () =>
      import('./exposed-modules/delegation-tx-builder'),
    loadTokenIdMapper: async () => import('./exposed-modules/token-id-mapper'),
    loadDeregistrationTxBuilder: async () =>
      import('./exposed-modules/deregistration-tx-builder'),
    loadVoteDelegationTxBuilder: async () =>
      import('./exposed-modules/vote-delegation-tx-builder'),
    loadEarnRewardsTxBuilder: async () =>
      import('./exposed-modules/earn-rewards-tx-builder'),
    loadSignerFactory: async () => import('./exposed-modules/signer-factory'),
  },
});
