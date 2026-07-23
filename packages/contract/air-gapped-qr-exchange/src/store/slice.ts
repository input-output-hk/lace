import { createSlice } from '@reduxjs/toolkit';

import type { TranslationKey } from '@lace-contract/i18n';
import type { BlockchainName } from '@lace-lib/util-store';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

/**
 * The pending air-gapped exchange the view renders. Bytes never live here: the
 * request is pre-encoded to animated-QR frame strings, and the device response
 * is carried as hex via the scanCompleted action (ADR-08).
 */
export interface PendingAirGappedQrExchange {
  /** Stable id correlating the pending exchange with its result action. */
  requestId: string;
  /** Ordered animated-QR part strings the view displays to the device. */
  frames: string[];
  /**
   * UR type(s) the view must reassemble from the device response. A single
   * string accepts one type; an array accepts any member.
   */
  expectedResponseType: string[] | string;
  /** Frames advanced per second when animating the request QR. Optional. */
  fps?: number;
  /** i18n key for the overlay title. Optional. */
  titleKey?: TranslationKey;
  /** i18n key for the overlay instruction text. Optional. */
  instructionKey?: TranslationKey;
  /**
   * i18n key for the instruction shown only while the request QR is displayed.
   * The scan phase ignores it. Optional.
   */
  requestInstructionKey?: TranslationKey;
  /**
   * Preformatted detail line rendered under the instruction while the request
   * QR is shown, e.g. a transaction hash the user cross-checks against the
   * device screen. Optional.
   */
  detail?: string;
  /** Blockchain whose icon the request QR shows. Defaults to Cardano. */
  chainType?: BlockchainName;
}

export interface AirGappedQrExchangeSliceState {
  pending: PendingAirGappedQrExchange | null;
}

const initialState: AirGappedQrExchangeSliceState = {
  pending: null,
};

/** Clears the pending exchange when the terminal action targets it. */
const clearPendingIfMatches = (
  state: AirGappedQrExchangeSliceState,
  requestId: string,
): void => {
  if (state.pending?.requestId === requestId) {
    state.pending = null;
  }
};

const slice = createSlice({
  name: 'airGappedQrExchange',
  initialState,
  reducers: {
    requested: (
      state,
      { payload }: PayloadAction<PendingAirGappedQrExchange>,
    ) => {
      state.pending = payload;
    },
    scanCompleted: (
      state,
      {
        payload,
      }: PayloadAction<{
        requestId: string;
        urType: string;
        cborHex: string;
      }>,
    ) => {
      clearPendingIfMatches(state, payload.requestId);
    },
    cancelled: (state, { payload }: PayloadAction<{ requestId: string }>) => {
      clearPendingIfMatches(state, payload.requestId);
    },
    failed: (
      state,
      { payload }: PayloadAction<{ requestId: string; message: string }>,
    ) => {
      clearPendingIfMatches(state, payload.requestId);
    },
  },
  selectors: {
    selectPending: state => state.pending,
  },
});

export const airGappedQrExchangeReducers = {
  [slice.name]: slice.reducer,
};

export const airGappedQrExchangeActions = {
  airGappedQrExchange: slice.actions,
};

export const airGappedQrExchangeSelectors = {
  airGappedQrExchange: slice.selectors,
};

export type AirGappedQrExchangeStoreState = StateFromReducersMapObject<
  typeof airGappedQrExchangeReducers
>;
