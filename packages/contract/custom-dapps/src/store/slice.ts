import { markParameterizedSelector } from '@lace-contract/module';
import {
  createSelector,
  createSlice,
  type PayloadAction,
  type StateFromReducersMapObject,
} from '@reduxjs/toolkit';

import { deriveDappNameFromUrl, normalizeUrlForId } from '../util/url-utils';
import { CustomDappId } from '../value-objects';

import type { CustomDappsSliceState } from './types';

export type { CustomDappsSliceState };

const initialState: CustomDappsSliceState = {
  customDappList: [],
};

const slice = createSlice({
  name: 'customDapps',
  initialState,
  reducers: {
    addCustomDapp: (
      state,
      { payload }: PayloadAction<{ url: string; name?: string }>,
    ) => {
      const id = CustomDappId(normalizeUrlForId(payload.url));
      if (state.customDappList.some(dapp => dapp.id === id)) return;
      state.customDappList.push({
        id,
        url: payload.url,
        name: payload.name?.trim() || deriveDappNameFromUrl(payload.url),
        addedAt: Date.now(),
      });
    },
    removeCustomDapp: (state, { payload }: PayloadAction<CustomDappId>) => {
      state.customDappList = state.customDappList.filter(
        dapp => dapp.id !== payload,
      );
    },
    editCustomDapp: (
      state,
      {
        payload,
      }: PayloadAction<{ id: CustomDappId; url: string; name?: string }>,
    ) => {
      const index = state.customDappList.findIndex(
        dapp => dapp.id === payload.id,
      );
      if (index === -1) return;
      const newId = CustomDappId(normalizeUrlForId(payload.url));
      if (
        newId !== payload.id &&
        state.customDappList.some(dapp => dapp.id === newId)
      )
        return;
      const existing = state.customDappList[index];
      state.customDappList[index] = {
        ...existing,
        id: newId,
        url: payload.url,
        name: payload.name?.trim() || deriveDappNameFromUrl(payload.url),
      };
    },
  },
  selectors: {
    selectCustomDappList: (state: Readonly<CustomDappsSliceState>) =>
      state.customDappList,
  },
});

const selectIsUrlSaved = markParameterizedSelector(
  createSelector(
    slice.selectors.selectCustomDappList,
    (_: unknown, url: string) => url,
    (customDappList, url) => {
      const normalized = normalizeUrlForId(url);
      return customDappList.some(dapp => dapp.id === normalized);
    },
  ),
);

const selectCustomDappById = markParameterizedSelector(
  createSelector(
    slice.selectors.selectCustomDappList,
    (_: unknown, id: CustomDappId) => id,
    (customDappList, id) => customDappList.find(dapp => dapp.id === id),
  ),
);

export const customDappsReducers = {
  [slice.name]: slice.reducer,
};

export const customDappsActions = {
  customDapps: slice.actions,
};

export const customDappsSelectors = {
  customDapps: {
    ...slice.selectors,
    selectIsUrlSaved,
    selectCustomDappById,
  },
};

export type CustomDappsStoreState = StateFromReducersMapObject<
  typeof customDappsReducers
>;
