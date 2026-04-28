import {
  createSlice,
  createSelector,
  type PayloadAction,
  type StateFromReducersMapObject,
} from '@reduxjs/toolkit';

import { initialState } from './types';

import type { AddressBookSliceState } from './types';
import type { Contact } from '../types';
import type { ContactId } from '../value-objects';

export type { AddressBookSliceState };

const slice = createSlice({
  name: 'addressBook',
  initialState,
  reducers: {
    addContact: (state, action: PayloadAction<Contact>) => {
      state.contacts[action.payload.id] = action.payload;
    },
    deleteContact: (state, action: PayloadAction<ContactId>) => {
      delete state.contacts[action.payload];
    },
  },
  selectors: {
    selectAllContacts: createSelector(
      [(state: AddressBookSliceState) => state.contacts],
      contacts => Object.values(contacts),
    ),
  },
});

export const addressBookReducers = {
  [slice.name]: slice.reducer,
};

export const addressBookActions = {
  addressBook: slice.actions,
};

export const addressBookSelectors = {
  addressBook: slice.selectors,
};

export type AddressBookStoreState = StateFromReducersMapObject<
  typeof addressBookReducers
>;
