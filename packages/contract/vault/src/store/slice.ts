import { createAction, createSlice } from '@reduxjs/toolkit';

import type {
  Ceremony,
  CeremonyOrigin,
  HwDevice,
  HwPairBlockchain,
} from '../types';
import type { PayloadAction } from '@reduxjs/toolkit';

const createWalletCeremonyRequested = createAction(
  'vault/createWalletCeremonyRequested',
  (payload: { origin: CeremonyOrigin }) => ({ payload }),
);

const importWalletCeremonyRequested = createAction(
  'vault/importWalletCeremonyRequested',
  (payload: { origin: CeremonyOrigin }) => ({ payload }),
);

// Dispatched only by the shell-host guest pickers; the in-app arm reaches the
// hardware flows by route. Declared from birth, first handler arrives with the
// hardware-wallet feature. `blockchain` names which chain's material the pairing
// extracts — one device serves several, and the picker resolves the choice
// before dispatching.
const connectHardwareCeremonyRequested = createAction(
  'vault/connectHardwareCeremonyRequested',
  (payload: { device: HwDevice; blockchain: HwPairBlockchain }) => ({
    payload,
  }),
);

const addAccountCeremonyRequested = createAction(
  'vault/addAccountCeremonyRequested',
  (payload: { walletId: string }) => ({ payload }),
);

const renameWalletCeremonyRequested = createAction(
  'vault/renameWalletCeremonyRequested',
  (payload: { walletId: string }) => ({ payload }),
);

// `accountId` names the account on BOTH arms — unlike the removal below, which
// needs an index too because the host removes a whole per-network fan-out. A
// rename targets exactly one account, so one identifier serves.
const renameAccountCeremonyRequested = createAction(
  'vault/renameAccountCeremonyRequested',
  (payload: { walletId: string; accountId: string }) => ({ payload }),
);

const removeWalletCeremonyRequested = createAction(
  'vault/removeWalletCeremonyRequested',
  (payload: { walletId: string }) => ({ payload }),
);

// `accountId` names the account for the in-app arm's removal flow; the host
// manager arm uses `accountIndex` as its non-authoritative pre-selection hint.
const removeAccountCeremonyRequested = createAction(
  'vault/removeAccountCeremonyRequested',
  (payload: { walletId: string; accountId: string; accountIndex: number }) => ({
    payload,
  }),
);

const revealRecoveryPhraseCeremonyRequested = createAction(
  'vault/revealRecoveryPhraseCeremonyRequested',
  (payload: { walletId: string }) => ({ payload }),
);

// The ceremony whose surface has been asked for but has not come up yet. One
// slot, because the host mounts exactly one modal surface at a time. `walletId`
// is carried for the per-wallet ceremonies so a screen listing several wallets
// can tell which row is launching.
type PendingCeremony = {
  ceremony: Ceremony;
  walletId?: string;
};

type VaultSliceState = {
  pendingCeremony: PendingCeremony | null;
};

const initialState: VaultSliceState = {
  pendingCeremony: null,
};

const slice = createSlice({
  name: 'vault',
  initialState,
  reducers: {
    // Emitted only by the arm whose launch has latency — the shell-host proxy,
    // whose `wallets.request*` round-trip can take seconds on a cold MV3
    // service worker. The in-app arm navigates in process and never emits it
    // (ADR 52); it never settles either, so a flag it set would strand.
    ceremonyLaunching: {
      prepare: (payload: PendingCeremony) => ({ payload }),
      reducer: (state, { payload }: PayloadAction<PendingCeremony>) => {
        state.pendingCeremony = payload;
      },
    },
    // Dispatched only by the shell-host arm when a `wallets.request*` surface
    // mount settles — any outcome. The in-app arm mutates the wallet repo
    // directly and never emits it. `mounted: false` says the surface never came
    // up, so the ceremony cannot have changed anything: consumers that
    // reconcile against the host (the wallet-repo re-sync) must skip it rather
    // than open a poll window for a change that by construction does not exist.
    ceremonySettled: {
      prepare: (payload: { ceremony: Ceremony; mounted: boolean }) => ({
        payload,
      }),
      // Clears whatever is pending regardless of `mounted`: a refused mount
      // ends the launch just as a successful one does.
      reducer: (state: VaultSliceState) => {
        state.pendingCeremony = null;
      },
    },
  },
  selectors: {
    // A raw state field, so it stays referentially stable as a `createSelector`
    // input. Readers derive their own booleans from it.
    selectPendingCeremony: ({ pendingCeremony }) => pendingCeremony,
  },
});

export const vaultReducers = {
  [slice.name]: slice.reducer,
};

/** Direct import of this is an anti-pattern. OK for tests. */
export const vaultActions = {
  vault: {
    createWalletCeremonyRequested,
    importWalletCeremonyRequested,
    connectHardwareCeremonyRequested,
    addAccountCeremonyRequested,
    renameWalletCeremonyRequested,
    renameAccountCeremonyRequested,
    removeWalletCeremonyRequested,
    removeAccountCeremonyRequested,
    revealRecoveryPhraseCeremonyRequested,
    ...slice.actions,
  },
};

export const vaultSelectors = {
  vault: slice.selectors,
};
