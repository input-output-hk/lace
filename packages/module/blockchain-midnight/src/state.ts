import './augmentations';

import { activitiesStoreContract } from '@lace-contract/activities';
import { addressBookAddressValidatorAddonContract } from '@lace-contract/address-book';
import { addressesStoreContract } from '@lace-contract/addresses';
import { appStoreContract } from '@lace-contract/app';
import { authenticationPromptStoreContract } from '@lace-contract/authentication-prompt';
import { dappConnectorStoreContract } from '@lace-contract/dapp-connector';
import { failuresStoreContract } from '@lace-contract/failures';
import { featureStoreContract } from '@lace-contract/feature';
import { midnightContextStoreContract } from '@lace-contract/midnight-context';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  addressValidatorAddonContract,
  baseTokenAddonContract,
  sendFlowAnalyticsEnhancerAddonContract,
  sendFlowStoreContract,
} from '@lace-contract/send-flow';
import { tokenPricingStoreContract } from '@lace-contract/token-pricing';
import { tokensStoreContract } from '@lace-contract/tokens';
import { txExecutorStoreContract } from '@lace-contract/tx-executor';
import { viewsStoreContract } from '@lace-contract/views';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import { FEATURE_FLAG_MIDNIGHT } from './const';
import store from './store';

import type { LaceModuleMap } from '@lace-contract/module';

// The state-only arm of this module: the same store, the same dependencies, and
// the logic addons (send-flow and address-book address validation, base-token
// selection, send-flow analytics), WITHOUT the page/sheet/dialog/customisation
// addons. Those addons are react-native
// presentation, and an addon thunk is a live property of the module object —
// nothing static can remove it — so an ESM bundler emits a chunk for every one of
// them and parses the whole react-native chain behind it. A DOM guest therefore
// cannot consume `./index` at all; it consumes this entry and renders its own UI
// over the same redux state.
//
// The contract lists are stated again here rather than shared with `./index`:
// sharing them would make the default entry import this file, and the two
// `implements` lists genuinely differ (the presentation-addon contracts are absent
// here, because `addons` is required for every contract a module implements).
// Drift fails loudly — `assertModuleCompatibility` throws at carbon's boot.
const implementsContracts = combineContracts([
  tokensStoreContract,
  addressesStoreContract,
  midnightContextStoreContract,
  addressValidatorAddonContract,
  // The address book's own validator, which is a DIFFERENT contract from the
  // send flow's: it takes the network to validate against as an argument
  // instead of reading the active account, so a saved contact address can be
  // checked without one. Its body reaches only
  // `@lace-contract/midnight-context`'s bech32m address codecs — no engine, no
  // react-native — which is why this arm can carry it.
  addressBookAddressValidatorAddonContract,
  // Which token a Midnight send OPENS on. The addon is `at-least-one` across the
  // loadout, so dropping it here was compatible — but the send flow resolves the
  // selector BY BLOCKCHAIN and falls back to the account's first token when the
  // chain has none, which on Midnight is whichever token the poll happened to
  // list first. Its body reads a ticker (`isNightTokenTicker`) and nothing else,
  // so this arm can carry it.
  baseTokenAddonContract,
  sendFlowAnalyticsEnhancerAddonContract,
] as const);

const dependsOnContracts = combineContracts([
  activitiesStoreContract,
  appStoreContract,
  dappConnectorStoreContract,
  featureStoreContract,
  walletRepoStoreContract,
  viewsStoreContract,
  authenticationPromptStoreContract,
  txExecutorStoreContract,
  failuresStoreContract,
  sendFlowStoreContract,
  tokenPricingStoreContract,
] as const);

const stateModule = inferModuleContext({
  moduleName: ModuleName('blockchain-midnight'),
  implements: implementsContracts,
  dependsOn: dependsOnContracts,
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_MIDNIGHT),
    metadata: {
      name: 'Midnight',
      description: 'Midnight blockchain support',
    },
  },
  addons: {
    loadAddressValidator: async () =>
      import('./exported-modules/address-validator'),
    loadAddressBookAddressValidators: async () =>
      import('./exported-modules/address-book-address-validator'),
    loadBaseToken: async () => import('./exported-modules/base-token-selector'),
    loadSendFlowAnalyticsEnhancers: async () =>
      import('./exported-modules/send-flow-analytics-enhancer'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': stateModule,
};

export default moduleMap;
