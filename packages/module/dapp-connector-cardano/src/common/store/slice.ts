import {
  createAction,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { AccountId, AnyAccount } from '@lace-contract/wallet-repo';
import type { HwSigningErrorTranslationKeys } from '@lace-lib/util-hw';

/**
 * Message structure sent from WebView to native code.
 * Follows CIP-30 request format for wallet API calls.
 */
export type WebViewMessage = {
  id: string;
  type: string;
  args?: unknown[];
  source: 'lace-cip30';
  /** Page title extracted from document.title in the WebView */
  pageTitle?: string;
  /** Favicon URL extracted from the page's link[rel~="icon"] in the WebView */
  faviconUrl?: string;
};

/**
 * Incoming WebView message with additional context.
 * Includes the dApp origin and timestamp for tracking.
 */
export type IncomingWebViewMessage = {
  message: WebViewMessage;
  dappOrigin: string;
  timestamp: number;
};

/**
 * Response structure sent from native code to WebView.
 * Contains the result or error from a wallet API call.
 */
export type WebViewResponse = {
  id: string;
  success: boolean;
  result?: unknown;
  error?: { code: number; info: string };
  timestamp: number;
};

/**
 * Platform-agnostic dApp information for display in UI.
 * Each platform converts this to their specific UI representation.
 */
export type DappInfo = {
  name: string;
  origin: string;
  imageUrl?: string;
};

/**
 * Pending authorization request from a dApp.
 * Used to display the authorization UI to the user.
 */
export type PendingAuthRequest = {
  requestId: string;
  dappOrigin: string;
  dapp: DappInfo;
};

/**
 * Pending sign data request for CIP-8 message signing.
 * Contains all information needed to display the sign data UI.
 * Used by both browser extension and mobile platforms.
 */
export type PendingSignDataRequest = {
  requestId: string;
  dappOrigin: string;
  dapp: DappInfo;
  address: string;
  payload: string;
};

/**
 * Pending sign transaction request for CIP-30 signTx.
 * Contains all information needed to display the sign transaction UI.
 * Used by both browser extension and mobile platforms.
 */
export type PendingSignTxRequest = {
  requestId: string;
  dappOrigin: string;
  dapp: DappInfo;
  txHex: string;
  partialSign: boolean;
};

/**
 * Response from the authorization flow.
 * Indicates whether the user authorized the dApp and which account was selected.
 */
export type AuthResponse = {
  authorized: boolean;
  account: AnyAccount | null;
};

/**
 * Last authorization response with tracking information.
 * Used to correlate responses with requests and for side effect processing.
 */
export type LastAuthResponse = {
  requestId: string;
  authorized: boolean;
  account: AnyAccount | null;
  timestamp: number;
};

/**
 * Value transferred to/from an address in a transaction.
 * Contains the total coins (lovelace) and any native assets.
 * Serialized as [address, { coins, assets }][] for Redux storage.
 */
export type SerializedTokenTransferValue = {
  coins: string;
  assets: [string, string][];
};

/**
 * Resolved transaction inputs for displaying foreign inputs in the UI.
 * Contains addresses resolved via Blockfrost API for inputs not in the wallet's UTXOs.
 */
export type ResolvedTransactionInputs = {
  /** Map of foreign addresses (not owned) sending funds, serialized for Redux */
  foreignFromAddresses: [string, SerializedTokenTransferValue][];
  /** Whether resolution is in progress */
  isResolving: boolean;
  /** Error message if resolution failed */
  error: string | null;
};

/**
 * Complete state shape for the Cardano dApp connector.
 * All state is at root level, shared across browser extension and mobile platforms.
 */
export type CardanoDappConnectorState = {
  pendingAuthRequest: PendingAuthRequest | null;
  lastAuthResponse: LastAuthResponse | null;
  sessionAuthorizedOrigins: string[];
  /**
   * Maps dApp origin to the account ID selected for that dApp.
   * Each dApp maintains its own account selection independently.
   */
  sessionAccountByOrigin: Record<string, AccountId>;
  /** Resolved foreign transaction inputs for UI display */
  resolvedTransactionInputs: ResolvedTransactionInputs | null;
  /** Pending sign data request */
  pendingSignDataRequest: PendingSignDataRequest | null;
  /** Pending sign transaction request */
  pendingSignTxRequest: PendingSignTxRequest | null;
  /** Whether signTx completed successfully (for showing success screen) */
  signTxCompleted: boolean;
  /** Whether signTx failed with a non-cancellation error (for showing error screen) */
  signTxError: boolean;
  /** Hardware-wallet-specific error translation keys for the error screen. */
  signTxHwErrorKeys: HwSigningErrorTranslationKeys | null;
  /** Whether signData completed successfully (for showing success screen) */
  signDataCompleted: boolean;
  /** Whether signData failed with a non-cancellation error (for showing error screen) */
  signDataError: boolean;
  /** Hardware-wallet-specific error translation keys for the error screen. */
  signDataHwErrorKeys: HwSigningErrorTranslationKeys | null;
  /**
   * Queue of responses to send to WebView (mobile).
   * Using a queue instead of single response to handle concurrent requests.
   */
  webViewResponseQueue: WebViewResponse[];
};

const initialState: CardanoDappConnectorState = {
  pendingAuthRequest: null,
  lastAuthResponse: null,
  sessionAuthorizedOrigins: [],
  sessionAccountByOrigin: {},
  resolvedTransactionInputs: null,
  pendingSignDataRequest: null,
  pendingSignTxRequest: null,
  signTxCompleted: false,
  signTxError: false,
  signTxHwErrorKeys: null,
  signDataCompleted: false,
  signDataError: false,
  signDataHwErrorKeys: null,
  webViewResponseQueue: [],
};

/**
 * Confirms dApp authorization with account selection.
 * Updates state: adds origin to sessionAuthorizedOrigins, sets lastAuthResponse,
 * and stores the selected account in sessionAccountByOrigin.
 *
 * Used by both platforms:
 * - Mobile: Dispatched directly from useAuthorizeDapp when user confirms
 * - Extension: Dispatched by side effect after popup race resolves
 */
const confirmAuth = createAction<AuthResponse>(
  'cardanoDappConnector/confirmAuth',
);

/**
 * Rejects dApp authorization.
 * Updates state: sets lastAuthResponse with authorized=false.
 *
 * Used by both platforms:
 * - Mobile: Dispatched directly from useAuthorizeDapp when user rejects
 * - Extension: Dispatched by side effect after popup race resolves
 */
const rejectAuth = createAction('cardanoDappConnector/rejectAuth');

/**
 * Extension-only: Initiates dApp connection confirmation flow.
 *
 * The browser extension popup can be closed at any time by the user clicking
 * outside it. This action triggers a side effect that races against popup
 * closure before eventually dispatching confirmAuth.
 *
 * Flow: User clicks confirm → confirmConnect → side effect races → confirmAuth
 *
 * Mobile doesn't need this because sheets don't have the same closure behavior.
 */
const confirmConnect = createAction<{ account: AnyAccount }>(
  'cardanoDappConnector/confirmConnect',
);

/**
 * Extension-only: Initiates dApp connection rejection flow.
 *
 * Triggers a side effect that races against popup closure before eventually
 * dispatching rejectAuth. See confirmConnect for details on why this exists.
 */
const rejectConnect = createAction('cardanoDappConnector/rejectConnect');

/**
 * Confirms transaction signing (CIP-30 signTx).
 * Triggers side effect to show auth prompt, sign the transaction, and return
 * the witness set to the dApp.
 *
 * Used by both platforms from their respective SignTx UI.
 */
const confirmSignTx = createAction('cardanoDappConnector/confirmSignTx');

/**
 * Rejects transaction signing (CIP-30 signTx).
 * Triggers side effect to send refusal error to the dApp.
 *
 * Used by both platforms from their respective SignTx UI.
 */
const rejectSignTx = createAction('cardanoDappConnector/rejectSignTx');

/**
 * Confirms data signing (CIP-8 signData).
 * Triggers side effect to show auth prompt, sign the data, and return
 * the signature to the dApp.
 *
 * Used by both platforms from their respective SignData UI.
 */
const confirmSignData = createAction('cardanoDappConnector/confirmSignData');

/**
 * Rejects data signing (CIP-8 signData).
 * Triggers side effect to send refusal error to the dApp.
 *
 * Used by both platforms from their respective SignData UI.
 */
const rejectSignData = createAction('cardanoDappConnector/rejectSignData');

/**
 * Mobile-only: Action dispatched by WebView bridge when a CIP-30 message is received.
 * Triggers side effect processing - no state change needed.
 */
const receiveWebViewMessage = createAction<IncomingWebViewMessage>(
  'cardanoDappConnector/receiveWebViewMessage',
);

const slice = createSlice({
  name: 'cardanoDappConnector',
  initialState,
  reducers: {
    /**
     * Set pending authorization request (called by bridge when dApp calls enable())
     */
    setPendingAuthRequest: (
      state,
      { payload }: PayloadAction<PendingAuthRequest | null>,
    ) => {
      state.pendingAuthRequest = payload;
    },
    clearPendingAuthRequest: state => {
      state.pendingAuthRequest = null;
    },
    clearLastAuthResponse: state => {
      state.lastAuthResponse = null;
    },
    /**
     * Add a dApp origin to session authorized list
     */
    addSessionAuthorizedOrigin: (state, { payload }: PayloadAction<string>) => {
      if (!state.sessionAuthorizedOrigins.includes(payload)) {
        state.sessionAuthorizedOrigins.push(payload);
      }
    },
    clearSessionAuthorizedOrigins: state => {
      state.sessionAuthorizedOrigins = [];
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
    /**
     * Clear the account for a specific dApp origin.
     */
    clearSessionAccountForOrigin: (
      state,
      { payload }: PayloadAction<string>,
    ) => {
      delete state.sessionAccountByOrigin[payload];
    },
    /**
     * Clear all per-origin account mappings.
     */
    clearAllSessionAccountsByOrigin: state => {
      state.sessionAccountByOrigin = {};
    },
    /**
     * Add a response to the WebView response queue (called by side effect).
     * Used by mobile to queue responses for the WebView.
     */
    setWebViewResponse: (
      state,
      { payload }: PayloadAction<WebViewResponse>,
    ) => {
      state.webViewResponseQueue.push(payload);
    },
    /**
     * Remove a specific response from the queue by id.
     * Used by mobile after the WebView has processed a response.
     */
    clearWebViewResponse: (
      state,
      { payload }: PayloadAction<string | undefined>,
    ) => {
      if (payload) {
        state.webViewResponseQueue = state.webViewResponseQueue.filter(
          r => r.id !== payload,
        );
      } else if (state.webViewResponseQueue.length > 0) {
        state.webViewResponseQueue.shift();
      }
    },
    /**
     * Mark signTx as completed successfully (for success screen).
     * Used by both browser extension and mobile platforms.
     */
    setSignTxCompleted: (state, { payload }: PayloadAction<boolean>) => {
      state.signTxCompleted = payload;
    },
    /**
     * Mark signTx as failed with a non-cancellation error (for error screen).
     */
    setSignTxError: (state, { payload }: PayloadAction<boolean>) => {
      state.signTxError = payload;
      if (!payload) state.signTxHwErrorKeys = null;
    },
    setSignTxHwErrorKeys: (
      state,
      { payload }: PayloadAction<HwSigningErrorTranslationKeys | null>,
    ) => {
      state.signTxHwErrorKeys = payload;
    },
    /**
     * Mark signData as completed successfully (for success screen).
     * Used by both browser extension and mobile platforms.
     */
    setSignDataCompleted: (state, { payload }: PayloadAction<boolean>) => {
      state.signDataCompleted = payload;
    },
    /**
     * Mark signData as failed with a non-cancellation error (for error screen).
     */
    setSignDataError: (state, { payload }: PayloadAction<boolean>) => {
      state.signDataError = payload;
      if (!payload) state.signDataHwErrorKeys = null;
    },
    setSignDataHwErrorKeys: (
      state,
      { payload }: PayloadAction<HwSigningErrorTranslationKeys | null>,
    ) => {
      state.signDataHwErrorKeys = payload;
    },
    /**
     * Set pending sign data request for UI display.
     * Used by both browser extension and mobile platforms.
     */
    setPendingSignDataRequest: (
      state,
      { payload }: PayloadAction<PendingSignDataRequest | null>,
    ) => {
      state.pendingSignDataRequest = payload;
      if (payload !== null) {
        state.signDataCompleted = false;
        state.signDataError = false;
        state.signDataHwErrorKeys = null;
      }
    },
    /**
     * Clear pending sign data request
     */
    clearPendingSignDataRequest: state => {
      state.pendingSignDataRequest = null;
    },
    /**
     * Set pending sign transaction request for UI display.
     * Used by both browser extension and mobile platforms.
     */
    setPendingSignTxRequest: (
      state,
      { payload }: PayloadAction<PendingSignTxRequest | null>,
    ) => {
      state.pendingSignTxRequest = payload;
      if (payload !== null) {
        state.signTxCompleted = false;
        state.signTxError = false;
        state.signTxHwErrorKeys = null;
      }
    },
    /**
     * Clear pending sign transaction request
     */
    clearPendingSignTxRequest: state => {
      state.pendingSignTxRequest = null;
    },
    /**
     * Set resolved foreign transaction inputs (from Blockfrost API resolution)
     */
    setResolvedTransactionInputs: (
      state,
      { payload }: PayloadAction<ResolvedTransactionInputs | null>,
    ) => {
      state.resolvedTransactionInputs = payload;
    },
    /**
     * Mark that input resolution is starting
     */
    startResolvingInputs: state => {
      state.resolvedTransactionInputs = {
        foreignFromAddresses: [],
        isResolving: true,
        error: null,
      };
    },
    /**
     * Clear resolved transaction inputs
     */
    clearResolvedTransactionInputs: state => {
      state.resolvedTransactionInputs = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(confirmAuth, (state, { payload }) => {
        if (state.pendingAuthRequest) {
          if (
            payload.authorized &&
            !state.sessionAuthorizedOrigins.includes(
              state.pendingAuthRequest.dappOrigin,
            )
          ) {
            state.sessionAuthorizedOrigins.push(
              state.pendingAuthRequest.dappOrigin,
            );
          }

          state.lastAuthResponse = {
            requestId: state.pendingAuthRequest.requestId,
            authorized: payload.authorized,
            account: payload.account,
            timestamp: Date.now(),
          };
          if (payload.authorized && payload.account) {
            state.sessionAccountByOrigin[state.pendingAuthRequest.dappOrigin] =
              payload.account.accountId;
          }
          state.pendingAuthRequest = null;
        }
      })
      .addCase(rejectAuth, state => {
        if (state.pendingAuthRequest) {
          state.lastAuthResponse = {
            requestId: state.pendingAuthRequest.requestId,
            authorized: false,
            account: null,
            timestamp: Date.now(),
          };
          state.pendingAuthRequest = null;
        }
      });
  },
  selectors: {
    selectPendingAuthRequest: (state: CardanoDappConnectorState) =>
      state.pendingAuthRequest,
    selectLastAuthResponse: (state: CardanoDappConnectorState) =>
      state.lastAuthResponse,
    selectSessionAuthorizedOrigins: (state: CardanoDappConnectorState) =>
      state.sessionAuthorizedOrigins,
    /** Get the per-origin account mapping */
    selectSessionAccountByOrigin: (state: CardanoDappConnectorState) =>
      state.sessionAccountByOrigin,
    /** Get resolved foreign transaction inputs */
    selectResolvedTransactionInputs: (state: CardanoDappConnectorState) =>
      state.resolvedTransactionInputs,
    /** Get current pending sign data request */
    selectPendingSignDataRequest: (state: CardanoDappConnectorState) =>
      state.pendingSignDataRequest,
    /** Get current pending sign transaction request */
    selectPendingSignTxRequest: (state: CardanoDappConnectorState) =>
      state.pendingSignTxRequest,
    /** Whether signTx completed successfully */
    selectSignTxCompleted: (state: CardanoDappConnectorState) =>
      state.signTxCompleted,
    /** Whether signTx failed with a non-cancellation error */
    selectSignTxError: (state: CardanoDappConnectorState) => state.signTxError,
    /** HW-specific translation keys for a sign-tx failure, if any. */
    selectSignTxHwErrorKeys: (state: CardanoDappConnectorState) =>
      state.signTxHwErrorKeys,
    /** Whether signData completed successfully */
    selectSignDataCompleted: (state: CardanoDappConnectorState) =>
      state.signDataCompleted,
    /** Whether signData failed with a non-cancellation error */
    selectSignDataError: (state: CardanoDappConnectorState) =>
      state.signDataError,
    /** HW-specific translation keys for a sign-data failure, if any. */
    selectSignDataHwErrorKeys: (state: CardanoDappConnectorState) =>
      state.signDataHwErrorKeys,
    /**
     * Get the queue of pending WebView responses.
     * Returns the full queue so the hook can process all responses.
     * Used by mobile to send responses back to the WebView.
     */
    selectWebViewResponseQueue: (state: CardanoDappConnectorState) =>
      state.webViewResponseQueue,
  },
});

/**
 * Reducers object for the Cardano dApp connector slice.
 * Used for store configuration.
 */
export const cardanoDappConnectorReducers = {
  [slice.name]: slice.reducer,
};

/**
 * Action creators for the Cardano dApp connector.
 * Includes both slice actions and standalone actions.
 */
export const cardanoDappConnectorActions = {
  cardanoDappConnector: {
    ...slice.actions,
    confirmAuth,
    rejectAuth,
    confirmConnect,
    rejectConnect,
    confirmSignTx,
    rejectSignTx,
    confirmSignData,
    rejectSignData,
    receiveWebViewMessage,
  },
};

/**
 * Selectors for accessing Cardano dApp connector state.
 */
export const cardanoDappConnectorSelectors = {
  cardanoDappConnector: slice.selectors,
};
