import { createStateMachineSlice } from '@lace-lib/util-store';
import { createStateMachine } from '@lace-lib/util-store';

import type { TranslationKey } from '@lace-contract/i18n';
import type { DeviceDescriptor, FoundDevice } from '@lace-lib/util-hw';
import type { StateObject } from '@lace-lib/util-store';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

export type HwConnectorMobileState =
  | StateObject<
      'Error',
      {
        errorTranslationKey: TranslationKey;
      }
    >
  | StateObject<
      'Searching',
      {
        devices: FoundDevice[];
      }
    >
  | StateObject<'Idle'>;

const initialState = {
  status: 'Idle',
} as HwConnectorMobileState;

const searchingState: HwConnectorMobileState = {
  status: 'Searching',
  devices: [],
};

const slice = createStateMachineSlice(
  createStateMachine('hw-connector-mobile', initialState, {
    _crossState: {
      cancel: () => initialState,
      // Idempotent entry into Searching: a fresh request from any state
      // (Idle, in-flight Searching, or Error) starts a clean discovery.
      connectionRequested: () => searchingState,
    },
    Idle: {
      // Late BLE emissions can arrive after the scanner stops; no-op outside Searching.
      devicesChanged: (previousState, _: { devices: FoundDevice[] }) =>
        previousState,
      // A late device-tap (sheet dismissed mid-tap, etc.) outside Searching is a no-op.
      deviceSelected: (previousState, _: { device: DeviceDescriptor }) =>
        previousState,
    },
    Searching: {
      errored: (
        _,
        { errorTranslationKey }: { errorTranslationKey: TranslationKey },
      ) => ({
        status: 'Error',
        errorTranslationKey,
      }),
      devicesChanged: (
        previousState,
        { devices }: { devices: FoundDevice[] },
      ) => ({
        ...previousState,
        devices,
      }),
      deviceSelected: (_, __: { device: DeviceDescriptor }) => initialState,
    },
    Error: {
      retry: () => searchingState,
      devicesChanged: (previousState, _: { devices: FoundDevice[] }) =>
        previousState,
      deviceSelected: (previousState, _: { device: DeviceDescriptor }) =>
        previousState,
    },
  }),
  {
    selectors: {
      selectState: state => state,
    },
  },
);

export const hwConnectorMobileReducers = {
  [slice.name]: slice.reducer,
};

export const hwConnectorMobileActions = {
  hwConnectorMobile: slice.actions,
};

export const hwConnectorMobileSelectors = {
  hwConnectorMobile: slice.selectors,
};

export type HwConnectorMobileStoreState = StateFromReducersMapObject<
  typeof hwConnectorMobileReducers
>;
