import { dappConnectorActions } from '@lace-contract/dapp-connector';
import { createAction, createSlice } from '@reduxjs/toolkit';

import type { SignPsbtOptions } from '../types';
import type { BitcoinSignatureType } from '@lace-contract/bitcoin-context';
import type { DappId } from '@lace-contract/dapp-connector';
import type { ViewLocation } from '@lace-contract/views';
import type { AccountId, AnyAccount } from '@lace-contract/wallet-repo';
import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Platform-agnostic dApp information for display in the review UI.
 */
export type DappInfo = {
  name: string;
  origin: string;
  imageUrl?: string;
};

/**
 * Pending signMessage request. Contains everything the sign message review
 * screen needs, including which signature scheme the dApp asked for.
 */
export type PendingSignMessageRequest = {
  requestId: string;
  dappOrigin: string;
  dapp: DappInfo;
  address: string;
  message: string;
  signatureType: BitcoinSignatureType;
};

/**
 * Pending signPsbt request. A single signPsbt call is represented
 * as a one-element psbtsBase64 array, so both APIs share one review flow;
 * currentIndex drives the pager when a batch holds more than one.
 */
export type PendingSignPsbtRequest = {
  requestId: string;
  dappOrigin: string;
  dapp: DappInfo;
  psbtsBase64: string[];
  currentIndex: number;
  /**
   * Account the request will be signed with, captured when it arrived. The
   * review scopes ownership to this account rather than re-resolving the
   * origin's session, which another tab can rebind while the review is open.
   */
  accountId?: AccountId;
  options?: SignPsbtOptions;
};

/**
 * Status of resolving the previous outputs a dApp-supplied PSBT spends but
 * does not itself carry (no witnessUtxo/nonWitnessUtxo).
 */
export type ResolvedInputsStatus = 'failed' | 'idle' | 'resolved' | 'resolving';

/**
 * A previous output resolved for one PSBT input, keyed 'txid:vout' with txid
 * in display-order (big-endian) hex, the same orientation
 * @lace-lib/bitcoin-psbt uses. scriptHex is the locking script; value is in
 * satoshis.
 */
export type ResolvedPreviousOut = {
  value: number;
  scriptHex: string;
};

/**
 * Resolved previous outputs for the pending signPsbt request's inputs that
 * were not self-contained, keyed 'txid:vout'.
 */
export type ResolvedInputs = {
  status: ResolvedInputsStatus;
  prevOuts: Record<string, ResolvedPreviousOut>;
};

/**
 * Complete state shape for the Bitcoin dApp connector.
 */
export type BitcoinDappConnectorState = {
  pendingSignMessageRequest: PendingSignMessageRequest | null;
  pendingSignPsbtRequest: PendingSignPsbtRequest | null;
  resolvedInputs: ResolvedInputs;
  /** Whether signMessage completed successfully (for showing a success screen) */
  signMessageCompleted: boolean;
  /** Whether signMessage failed with a non-cancellation error (for showing an error screen) */
  signMessageError: boolean;
  /** Whether signPsbt completed successfully (for showing a success screen) */
  signPsbtCompleted: boolean;
  /** Whether signPsbt failed with a non-cancellation error (for showing an error screen) */
  signPsbtError: boolean;
  /**
   * Maps dApp origin to the account ID selected for that dApp.
   * Each dApp maintains its own account selection independently.
   */
  sessionAccountByOrigin: Record<string, AccountId>;
};

const initialState: BitcoinDappConnectorState = {
  pendingSignMessageRequest: null,
  pendingSignPsbtRequest: null,
  resolvedInputs: { status: 'idle', prevOuts: {} },
  signMessageCompleted: false,
  signMessageError: false,
  signPsbtCompleted: false,
  signPsbtError: false,
  sessionAccountByOrigin: {},
};

/**
 * Confirms message signing (signMessage).
 * Triggers a side effect to show the auth prompt, sign the message, and
 * return the signature to the dApp.
 */
const confirmSignMessage = createAction(
  'bitcoinDappConnector/confirmSignMessage',
);

/**
 * Rejects message signing (signMessage).
 * Triggers a side effect to send a refusal error to the dApp.
 */
const rejectSignMessage = createAction(
  'bitcoinDappConnector/rejectSignMessage',
);

/**
 * Confirms PSBT signing (signPsbt).
 * Triggers a side effect to show the auth prompt, sign every PSBT in the
 * batch, and return the results to the dApp.
 */
const confirmSignPsbt = createAction('bitcoinDappConnector/confirmSignPsbt');

/**
 * Rejects PSBT signing (signPsbt).
 * Triggers a side effect to send a refusal error to the dApp.
 */
const rejectSignPsbt = createAction('bitcoinDappConnector/rejectSignPsbt');

/**
 * Confirms a dApp connection with the account the user picked on the connect
 * screen. The prompt side effect binds that account to the authenticated
 * sender origin and completes the shared authorize job.
 */
const confirmConnect = createAction<{ account: AnyAccount; dappId: DappId }>(
  'bitcoinDappConnector/confirmConnect',
);

/**
 * Rejects a dApp connection from the connect screen. The prompt side effect
 * dismisses the review and completes the shared authorize job as unauthorized.
 */
const rejectConnect = createAction('bitcoinDappConnector/rejectConnect');

/**
 * Requests the service worker to close the popup window at the given location.
 * Dispatched by a popup; a side effect resolves the view id and dispatches
 * `views.closeView`, which reaches that view's remote `close()` and has the
 * popup document run `window.close()` on itself. The dispatcher addresses the
 * window by view id because it holds no handle on that document.
 */
const closePopupRequested = createAction<ViewLocation>(
  'bitcoinDappConnector/closePopupRequested',
);

const slice = createSlice({
  name: 'bitcoinDappConnector',
  initialState,
  reducers: {
    /**
     * Set pending signMessage request for UI display.
     * Resets the completed/error flags so a previous result does not leak
     * into the newly opened review screen.
     */
    setPendingSignMessageRequest: (
      state,
      { payload }: PayloadAction<PendingSignMessageRequest | null>,
    ) => {
      state.pendingSignMessageRequest = payload;
      if (payload !== null) {
        state.signMessageCompleted = false;
        state.signMessageError = false;
      }
    },
    clearPendingSignMessageRequest: state => {
      state.pendingSignMessageRequest = null;
    },
    /**
     * Set pending signPsbt request for UI display.
     * Resets the completed/error flags and the resolved-inputs state so a
     * previous request's data does not leak into the newly opened review.
     */
    setPendingSignPsbtRequest: (
      state,
      { payload }: PayloadAction<PendingSignPsbtRequest | null>,
    ) => {
      state.pendingSignPsbtRequest = payload;
      if (payload !== null) {
        state.signPsbtCompleted = false;
        state.signPsbtError = false;
        state.resolvedInputs = { status: 'idle', prevOuts: {} };
      }
    },
    clearPendingSignPsbtRequest: state => {
      state.pendingSignPsbtRequest = null;
    },
    /**
     * Move the review pager to the given index, clamped to the
     * batch's bounds. No-op when there is no pending signPsbt request.
     */
    setPsbtPagerIndex: (state, { payload }: PayloadAction<number>) => {
      if (!state.pendingSignPsbtRequest) return;
      const maxIndex = state.pendingSignPsbtRequest.psbtsBase64.length - 1;
      state.pendingSignPsbtRequest.currentIndex = Math.min(
        Math.max(payload, 0),
        maxIndex,
      );
    },
    /**
     * Mark that resolving the PSBT's missing previous outputs has started.
     */
    startResolvingInputs: state => {
      state.resolvedInputs = { status: 'resolving', prevOuts: {} };
    },
    /**
     * Set the previous outputs resolved for the pending signPsbt request.
     */
    setResolvedInputs: (
      state,
      { payload }: PayloadAction<Record<string, ResolvedPreviousOut>>,
    ) => {
      state.resolvedInputs = { status: 'resolved', prevOuts: payload };
    },
    /**
     * Mark that resolving the PSBT's missing previous outputs failed.
     */
    failResolvingInputs: state => {
      state.resolvedInputs.status = 'failed';
    },
    /**
     * Mark signMessage as completed successfully (for success screen).
     */
    setSignMessageCompleted: (state, { payload }: PayloadAction<boolean>) => {
      state.signMessageCompleted = payload;
    },
    /**
     * Mark signMessage as failed with a non-cancellation error (for error screen).
     */
    setSignMessageError: (state, { payload }: PayloadAction<boolean>) => {
      state.signMessageError = payload;
    },
    /**
     * Mark signPsbt as completed successfully (for success screen).
     */
    setSignPsbtCompleted: (state, { payload }: PayloadAction<boolean>) => {
      state.signPsbtCompleted = payload;
    },
    /**
     * Mark signPsbt as failed with a non-cancellation error (for error screen).
     */
    setSignPsbtError: (state, { payload }: PayloadAction<boolean>) => {
      state.signPsbtError = payload;
    },
    /**
     * Set the account ID for a specific dApp origin.
     * Used to maintain per-dApp account selection.
     */
    setSessionAccountForOrigin: (
      state,
      { payload }: PayloadAction<{ origin: string; accountId: AccountId }>,
    ) => {
      state.sessionAccountByOrigin[payload.origin] = payload.accountId;
    },
  },
  extraReducers: builder => {
    builder.addCase(
      dappConnectorActions.authorizedDapps.removeAuthorizedDapp,
      (state, { payload }) => {
        if (payload.blockchainName !== 'Bitcoin') return;
        delete state.sessionAccountByOrigin[payload.dapp.id];
      },
    );
  },
  selectors: {
    /** Get the current pending signMessage request */
    selectPendingSignMessageRequest: (state: BitcoinDappConnectorState) =>
      state.pendingSignMessageRequest,
    /** Get the current pending signPsbt request */
    selectPendingSignPsbtRequest: (state: BitcoinDappConnectorState) =>
      state.pendingSignPsbtRequest,
    /** Get the resolved previous outputs for the pending signPsbt request */
    selectResolvedInputs: (state: BitcoinDappConnectorState) =>
      state.resolvedInputs,
    /** Whether signMessage completed successfully */
    selectSignMessageCompleted: (state: BitcoinDappConnectorState) =>
      state.signMessageCompleted,
    /** Whether signMessage failed with a non-cancellation error */
    selectSignMessageError: (state: BitcoinDappConnectorState) =>
      state.signMessageError,
    /** Whether signPsbt completed successfully */
    selectSignPsbtCompleted: (state: BitcoinDappConnectorState) =>
      state.signPsbtCompleted,
    /** Whether signPsbt failed with a non-cancellation error */
    selectSignPsbtError: (state: BitcoinDappConnectorState) =>
      state.signPsbtError,
    /** Get the per-origin account mapping */
    selectSessionAccountByOrigin: (state: BitcoinDappConnectorState) =>
      state.sessionAccountByOrigin,
  },
});

/**
 * Reducers object for the Bitcoin dApp connector slice.
 * Used for store configuration.
 */
export const bitcoinDappConnectorReducers = {
  [slice.name]: slice.reducer,
};

/**
 * Action creators for the Bitcoin dApp connector.
 * Includes both slice actions and standalone actions.
 */
export const bitcoinDappConnectorActions = {
  bitcoinDappConnector: {
    ...slice.actions,
    confirmSignMessage,
    rejectSignMessage,
    confirmSignPsbt,
    rejectSignPsbt,
    confirmConnect,
    rejectConnect,
    closePopupRequested,
  },
};

/**
 * Selectors for accessing Bitcoin dApp connector state.
 */
export const bitcoinDappConnectorSelectors = {
  bitcoinDappConnector: slice.selectors,
};
