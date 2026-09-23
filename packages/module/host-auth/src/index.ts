// The guest's auth posture: the host owns authentication end-to-end (ADR 34),
// so the sandboxed cross-origin guest has no lock state and never runs a
// lock/unlock transition. It stands in for @lace-module/app-lock
// (dropped from the guest loadout) by implementing the three exactly-one
// contracts app-lock was the guest's sole provider of:
//
// - `walletActiveStateDependencyContract`: the wallet is permanently active
//   (`isWalletActive$: of(true)`) and `walletResumed$` never fires — mirrors the
//   headless SDK base module (apps/lace-sdk/src/base-module-store/init.ts).
// - `appLockSetupAddon` (`loadSetupAppLock`): create/import run host-side
//   ceremonies (ADR 36), so setup is a no-op that reports success.
// - `authSecretVerifierAddonContract` (`loadAuthSecretVerifier`): the guest never
//   verifies a password (host-owned), so the verifier always rejects.
//
// app-lock's UI (the Settings "App lock" row + LockSettings sheet) rode its
// zero-or-more customisation addons, so it disappears automatically with the
// module — nothing to reimplement here.
import { appLockSetupAddon } from '@lace-contract/app-lock';
import { authSecretVerifierAddonContract } from '@lace-contract/authentication-prompt';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { walletActiveStateDependencyContract } from '@lace-contract/wallet-active-state';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleAddons,
  ModuleSelectors,
} from '@lace-contract/module';

const implementsContracts = combineContracts([
  appLockSetupAddon,
  authSecretVerifierAddonContract,
  walletActiveStateDependencyContract,
] as const);

const guestModule = inferModuleContext({
  moduleName: ModuleName('host-auth'),
  implements: implementsContracts,
  store,
  addons: {
    loadSetupAppLock: async () => import('./setup-app-lock'),
    loadAuthSecretVerifier: async () => import('./auth-secret-verifier'),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-extension-carbon': guestModule,
  'lace-extension-guest': guestModule,
};

export default moduleMap;

export type Selectors = ModuleSelectors<typeof guestModule>;
export type ActionCreators = ModuleActionCreators<typeof guestModule>;
export type AvailableAddons = ModuleAddons<typeof implementsContracts>;
