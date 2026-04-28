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
import { walletRepoStoreContract } from '@lace-contract/wallet-repo';

const implementsContracts = combineContracts([
  activitiesStoreContract,
  networkStoreContract,
  failuresStoreContract,
  walletRepoStoreContract,
  signerStoreContract,
] as const);

export const sdkBaseModule = inferModuleContext({
  moduleName: ModuleName('lace-sdk-base'),
  implements: implementsContracts,
  addons: {},
});
