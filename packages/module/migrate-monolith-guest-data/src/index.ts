import './augmentations';

import { addressBookStoreContract } from '@lace-contract/address-book';
import { analyticsStoreContract } from '@lace-contract/analytics';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { tokensStoreContract } from '@lace-contract/tokens';

import store from './store';

import type {
  ActionType,
  LaceModuleMap,
  LaceSideEffect,
  ModuleActionCreators,
  ModuleSelectors,
} from '@lace-contract/module';

// Guest-only: the one-time monolith→shell relocation of the GUEST-owned
// persisted slices (ADR 38). The host relocates what it owns — wallets, dapp
// grants, the password sentinel — and cannot relocate these three: contacts, NFT
// folders and the analytics user id are guest state it holds no schema for. But
// they live in the extension's `chrome.storage.local`, which the sandboxed
// cross-origin guest cannot reach (ADR 35), so the host serves them OPAQUELY over
// `settings.migrateMonolithGuestData` and this module owns the interpretation:
// it validates the untrusted legacy records, dispatches them into the
// addressBook / tokenFolders / analytics slices, and only once redux-persist has
// landed them in the guest's own storage reports back — which is what lets the
// host delete the legacy keys.
//
// Ordering is the durability contract: the legacy keys are the ONLY copy until
// the report lands, so a crash anywhere before it leaves them readable and the
// next boot re-imports (the pull is non-mutating). The import is written to be
// re-runnable for exactly that reason.
const guestModule = inferModuleContext({
  moduleName: ModuleName('migrate-monolith-guest-data'),
  implements: combineContracts([] as const),
  dependsOn: combineContracts([
    addressBookStoreContract,
    tokensStoreContract,
    analyticsStoreContract,
  ] as const),
  store,
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-extension-guest': guestModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof guestModule>;
export type ActionCreators = ModuleActionCreators<typeof guestModule>;
export type SideEffect = LaceSideEffect<Selectors, ActionCreators>;
export type MigrateMonolithGuestDataAction = ActionType<ActionCreators>;
