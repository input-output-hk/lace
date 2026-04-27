import { addressBookAddressValidatorAddonContract } from '@lace-contract/address-book';
import { addressesStoreContract } from '@lace-contract/addresses';
import {
  cardanoInMemorySigningDependencyContract,
  cardanoProviderStoreContract,
  delegationTxBuilderAddonContract,
  deregistrationTxBuilderAddonContract,
  FEATURE_FLAG_CARDANO,
} from '@lace-contract/cardano-context';
import { featureStoreContract } from '@lace-contract/feature';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
// TODO: re-add addressValidatorAddonContract and baseTokenAddonContract once
// @lace-contract/send-flow barrel is decoupled from react-native.
// Chain: send-flow → tx-executor → authentication-prompt → react-native.
import { signerFactoryAddonContract } from '@lace-contract/signer';
// TODO: re-add stakingCenterStoreContract once decoupled from react-native.
// Chain: staking-center → tx-executor → authentication-prompt → react-native.
import { syncStoreContract } from '@lace-contract/sync';
import { tokenIdMapperAddonContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
// TODO: re-add txExecutorImplementationAddonContract once @lace-contract/tx-executor
// barrel is decoupled from @lace-contract/authentication-prompt (react-native).
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

const implementsContracts = combineContracts([
  inMemoryIntegrationAddonContract,
  tokensStoreContract,
  addressesStoreContract,
  signerFactoryAddonContract,
  syncStoreContract,
  addressBookAddressValidatorAddonContract,
  delegationTxBuilderAddonContract,
  cardanoInMemorySigningDependencyContract,
  tokenIdMapperAddonContract,
  deregistrationTxBuilderAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  featureStoreContract,
  cardanoProviderStoreContract,
  walletRepoStoreContract,
] as const);

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
    loadSignerFactory: async () => import('./exposed-modules/signer-factory'),
  },
});
