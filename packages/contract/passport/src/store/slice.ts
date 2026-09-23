import { createSlice } from '@reduxjs/toolkit';

import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';
import type * as _immer from 'immer'; // NOSONAR: required so immer's WritableDraft types are referenceable in emitted .d.ts files

/**
 * Lifecycle status of a Passport account's Account Custody Contract.
 * `ready` accounts have at least one activated device.
 */
export type PassportAccountStatus = 'ready';

export type PassportAccountInfo = {
  address: string;
  bindingVersion: string;
  status: PassportAccountStatus;
};

/**
 * Progress of the current Passport operation: from idle, through the
 * passkey ceremony and on-chain deployment steps, to a ready account.
 */
export type PassportFlow =
  | 'activating'
  | 'ceremony'
  | 'deploying'
  | 'error'
  | 'idle'
  | 'proving'
  | 'ready'
  | 'sponsoring';

export type PassportFlowError = {
  code: string;
  message: string;
};

export type PassportDevice = {
  commitmentHex: string;
  isLocal: boolean;
};

export type PassportSliceState = {
  account?: PassportAccountInfo;
  flow: PassportFlow;
  flowError?: PassportFlowError;
  devices: PassportDevice[];
  localUseCounter?: string;
};

const initialState: PassportSliceState = {
  flow: 'idle',
  devices: [],
};

type CreateAccountPayload = { lockAccount: boolean };
type DevicePayload = { commitmentHex: string };

const slice = createSlice({
  name: 'passport',
  initialState,
  reducers: {
    /**
     * Requests deployment of a new Account Custody Contract and the
     * activation of its first device. `lockAccount` decides whether the
     * contract's maintenance authority is retired once activation
     * completes; the side effect that drives the ceremony reads it from
     * the action rather than from state.
     *
     * A pure trigger: passport flows are mutually exclusive and only the
     * side effect knows whether a request is accepted or dropped, so it
     * owns every transition, down to entering 'ceremony'. A dropped
     * request must leave the running flow's state alone.
     */
    createAccount: (_state, _action: PayloadAction<CreateAccountPayload>) => {},

    /**
     * Requests that an existing account be recognised on this device. A
     * pure trigger, for the same reason as {@link createAccount}.
     */
    signIn: () => {},

    /**
     * Requests enrolment of a device by its entry commitment. A pure
     * trigger, for the same reason as {@link createAccount}: the roster
     * only changes via setDevices once the on-chain add_device call is
     * confirmed, so a failed enrolment never leaves state diverged from
     * the chain.
     */
    addDevice: (_state, _action: PayloadAction<DevicePayload>) => {},

    /**
     * Requests revocation of a device by its commitment. A pure trigger,
     * for the same reason as {@link createAccount}: the roster only
     * changes via setDevices once the on-chain remove_device call is
     * confirmed, so a rejected removal (see LastDeviceError) never leaves
     * state diverged from the chain.
     */
    removeDevice: (_state, _action: PayloadAction<DevicePayload>) => {},

    setFlow: (state, { payload }: PayloadAction<PassportFlow>) => {
      state.flow = payload;
      if (payload !== 'error') state.flowError = undefined;
    },

    setFlowError: (state, { payload }: PayloadAction<PassportFlowError>) => {
      state.flow = 'error';
      state.flowError = payload;
    },

    setAccount: (state, { payload }: PayloadAction<PassportAccountInfo>) => {
      state.account = payload;
    },

    setDevices: (state, { payload }: PayloadAction<PassportDevice[]>) => {
      state.devices = payload;
    },

    setLocalUseCounter: (state, { payload }: PayloadAction<string>) => {
      state.localUseCounter = payload;
    },

    reset: () => initialState,
  },
  selectors: {
    selectAccount: ({ account }) => account,
    selectFlow: ({ flow }) => flow,
    selectFlowError: ({ flowError }) => flowError,
    selectDevices: ({ devices }) => devices,
    selectLocalUseCounter: ({ localUseCounter }) => localUseCounter,
  },
});

export const passportReducers = {
  [slice.name]: slice.reducer,
};

export const passportActions = {
  passport: slice.actions,
};

export const passportSelectors = {
  passport: slice.selectors,
};

export type PassportStoreState = StateFromReducersMapObject<
  typeof passportReducers
>;
