import './augmentations';

import { dappConnectorStoreContract } from '@lace-contract/dapp-connector';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';

import store from './store';

import type {
  LaceModuleMap,
  ModuleActionCreators,
  ModuleSelectors,
  LaceSideEffect,
} from '@lace-contract/module';

// Guest-only: the dapp leg is host-owned end-to-end (ADR 41 —
// dapp-connector-cardano is dropped from the guest loadout), so nothing
// guest-side writes the authorizedDapps slice the Authorized DApps sheet
// renders. This module bridges the host grant table into it over
// `window.lace` (ADR 41 `lace.dapps`): it hydrates the slice from
// `dapps.list` at store init and on every `authorizedDappsViewed` signal (the
// sheet dispatches it on mount), and on `removeAuthorizedDapp` calls
// `dapps.revoke` then re-pulls (the reducer's optimistic removal covers the
// gap). Hydration is pull-only (ADR 35 — the host pushes no grant-change
// event): a grant written by a host-side dapp connect while the guest is
// already running is invisible until the view-open re-pull surfaces it, so
// the sheet never renders a stale snapshot.
const guestModule = inferModuleContext({
  moduleName: ModuleName('dapp-connector-host-pull'),
  implements: combineContracts([] as const),
  dependsOn: combineContracts([dappConnectorStoreContract] as const),
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
