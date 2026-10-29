/**
 * SDK base module - implements the "app shell" store contracts
 * that app-mobile currently provides.
 *
 * NOTE: app-mobile owns too many store contracts that should ideally
 * be implemented by their respective domain modules (e.g., sendFlowStoreContract
 * should be owned by a send-flow domain module, activitiesStoreContract by an
 * activities domain module, etc.). This base module inherits that over-centralization
 * for now. As contracts get properly distributed to domain modules in the future,
 * this base module should shrink.
 */
import { activitiesStoreContract } from '@lace-contract/activities';
import {
  analyticsProviderDependencyContract,
  analyticsStoreContract,
} from '@lace-contract/analytics';
import { failuresStoreContract } from '@lace-contract/failures';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { networkStoreContract } from '@lace-contract/network';
import { signerStoreContract } from '@lace-contract/signer';
// TODO: re-add sendFlowStoreContract and txExecutorStoreContract once
// @lace-contract/authentication-prompt is decoupled from react-native.
// Chain: send-flow → tx-executor → authentication-prompt → react-native.
import { walletActiveStateDependencyContract } from '@lace-contract/wallet-active-state';
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

import store from './base-module-store';

const implementsContracts = combineContracts([
  activitiesStoreContract,
  // Every chain reaches the analytics store: Midnight through failures-store,
  // Cardano through cardano-provider-store, and Cardano and Bitcoin through
  // the app and views stores of the Cardano app module. The base module is
  // the one module every loadout loads, so it carries the store for all of
  // them, a loadout with no chain module included; loading it only where it
  // is reached would need the module system to know which loadouts reach it.
  // In every loadout the store mints a random analytics user id and persists
  // it under the `analytics` key of the host's storage. The id goes no
  // further: this module's `trackAnalyticsEvent` reports nothing.
  analyticsStoreContract,
  analyticsProviderDependencyContract,
  networkStoreContract,
  failuresStoreContract,
  walletActiveStateDependencyContract,
  walletRepoStoreContract,
  signerStoreContract,
] as const);

export const sdkBaseModule = inferModuleContext({
  moduleName: ModuleName('lace-sdk-base'),
  implements: implementsContracts,
  store,
  addons: {},
});
