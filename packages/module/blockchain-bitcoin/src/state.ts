import './augmentations';

import { activitiesStoreContract } from '@lace-contract/activities';
import { addressBookAddressValidatorAddonContract } from '@lace-contract/address-book';
import { addressesStoreContract } from '@lace-contract/addresses';
import {
  BITCOIN_FEATURE_FLAG,
  bitcoinFeeMarketProvider,
  bitcoinProviderContract,
} from '@lace-contract/bitcoin-context';
import { inMemoryIntegrationAddonContract } from '@lace-contract/in-memory';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import {
  addressValidatorAddonContract,
  baseTokenAddonContract,
  chainMinimumAmountTokenValidatorAddonContract,
  sendFlowStoreContract,
} from '@lace-contract/send-flow';
import { syncStoreContract } from '@lace-contract/sync';
import { tokenIdMapperAddonContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import { txExecutorImplementationAddonContract } from '@lace-contract/tx-executor';
import { walletActiveStateDependencyContract } from '@lace-contract/wallet-active-state';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './store';

import type { LaceModuleMap } from '@lace-contract/module';

// The state-only arm of this module: the same store, feature gate and
// dependencies WITHOUT the react-native presentation addons. An addon thunk is a
// live property of the module object — nothing static can remove it — so an ESM
// bundler emits a chunk for every one of them and parses the whole react-native
// chain behind it. A DOM guest consumes this entry instead and renders its own UI
// over the same redux state. Like the guest arm of `./index`, signing comes from
// the host, so no in-process signer factory is registered here. The contract
// lists are restated rather than shared, because `addons` is required for every
// contract a module implements — the two lists genuinely differ.
const implementsContracts = combineContracts([
  inMemoryIntegrationAddonContract,
  tokensStoreContract,
  addressesStoreContract,
  syncStoreContract,
  txExecutorImplementationAddonContract,
  addressValidatorAddonContract,
  baseTokenAddonContract,
  chainMinimumAmountTokenValidatorAddonContract,
  addressBookAddressValidatorAddonContract,
  tokenIdMapperAddonContract,
] as const);
const dependsOnContracts = combineContracts([
  bitcoinProviderContract,
  bitcoinFeeMarketProvider,
  networkStoreContract,
  walletRepoStoreContract,
  walletActiveStateDependencyContract,
  activitiesStoreContract,
  tokensStoreContract,
  sendFlowStoreContract,
] as const);

const stateModule = inferModuleContext({
  moduleName: ModuleName('blockchain-bitcoin'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  feature: {
    metadata: { name: 'Bitcoin', description: '' },
    willLoad: (featureFlags: readonly { key: string }[]) =>
      featureFlags.map(({ key }) => key).includes(BITCOIN_FEATURE_FLAG),
  },
  addons: {
    loadInMemoryWalletIntegration: async () =>
      import('./in-memory-wallet-integration'),
    loadAddressValidator: async () => import('./address-validator'),
    loadBaseToken: async () => import('./exposed-modules/base-token-selector'),
    loadChainMinimumAmountTokenValidator: async () =>
      import('./exposed-modules/chain-minimum-amount-token-validator'),
    loadTxExecutorImplementation: async () =>
      import('./tx-executor-implementation'),
    loadAddressBookAddressValidators: async () =>
      import('./exposed-modules/address-book-address-validator'),
    loadTokenIdMapper: async () => import('./exposed-modules/token-id-mapper'),
  },
  store,
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': stateModule,
};

export default moduleMap;
