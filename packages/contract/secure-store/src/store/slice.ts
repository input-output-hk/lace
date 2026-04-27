import {
  createStateMachine,
  createStateMachineSlice,
} from '@lace-lib/util-store';

import type { StateObject } from '@lace-lib/util-store';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';
import type * as _immer from 'immer';

export type SecureStoreSliceState =
  | StateObject<'Available'>
  | StateObject<'Initialising'>
  | StateObject<'NotAvailable'>;

export const initialState = {
  status: 'Initialising',
} as SecureStoreSliceState;

const slice = createStateMachineSlice(
  createStateMachine('secureStore', initialState, {
    Initialising: {
      availabilityChecked: (_, { available }: { available: boolean }) => ({
        status: available ? 'Available' : 'NotAvailable',
      }),
    },
    Available: {},
    NotAvailable: {},
  }),
  {
    selectors: {
      isAvailable: ({ status }) => status === 'Available',
      selectSecureStoreState: state => state,
    },
  },
);

export const secureStoreReducers = {
  [slice.name]: slice.reducer,
};

export const secureStoreActions = {
  secureStore: slice.actions,
};

export const secureStoreSelectors = {
  secureStore: slice.selectors,
};

export type SecureStoreStoreState = StateFromReducersMapObject<
  typeof secureStoreReducers
>;
