import { DEFAULT_LANGUAGE, isSupportedLanguage } from '@lace-contract/i18n';
import { createAction, createSelector, createSlice } from '@reduxjs/toolkit';

import type { View, ViewType, ViewLocation } from '../types';
import type { SupportedLanguage } from '@lace-contract/i18n';
import type { ViewId } from '@lace-contract/module';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';
import type * as history from 'history';
// tsc complains about not portable exports without importing types from those packages
import type * as _Redux from 'redux';
import type * as _Reselect from 'reselect';

export type ColorScheme = 'dark' | 'light';
export type BottomSheet =
  | 'account-key'
  | 'collateral-send-tx'
  | 'recovery-phrase'
  | 'remove-account-success'
  | 'remove-account'
  | 'remove-wallet-success'
  | 'remove-wallet';

export type Page = {
  route: string;
  params?: Record<string, unknown>;
};

export type SheetPageNavigation = Page & {
  /** When set, only the side panel with this view ID acts on the navigation. */
  targetViewId?: ViewId;
};

export type ViewsSliceState = {
  colorScheme: ColorScheme;
  open: Record<ViewId, View>;
  activeSheet: BottomSheet | null;
  activePage: Page | null;
  activeSheetPage: SheetPageNavigation | null;
  language: SupportedLanguage;
  hasExplicitLanguagePreference: boolean;
};

export type OpenViewPayload = {
  location: ViewLocation;
  type: ViewType;
};

export type LocationChangedPayload = {
  location: ViewLocation;
  viewId: ViewId;
};

// Could extend this with more history method actions
export type HistoryMethod = 'push';
export type CallHistoryMethodPayload<M extends HistoryMethod> = {
  args: Parameters<history.History[M]>;
  method: M;
  viewId: ViewId;
};

const initialState: ViewsSliceState = {
  open: {},
  colorScheme: 'light',
  activeSheet: null,
  activePage: null,
  activeSheetPage: null,
  language: DEFAULT_LANGUAGE,
  hasExplicitLanguagePreference: false,
};

const slice = createSlice({
  name: 'views',
  initialState,
  reducers: {
    viewConnected: (state, { payload }: Readonly<PayloadAction<View>>) => {
      state.open[payload.id] = payload;
    },
    viewDisconnected: (state, { payload }: Readonly<PayloadAction<ViewId>>) => {
      delete state.open[payload];
    },
    /**
     * Dispatched when history receives a location change.
     *
     * DO NOT DISPATCH MANUALLY: use 'navigate' instead.
     */
    locationChanged: (
      state,
      {
        payload: { viewId, location },
      }: Readonly<PayloadAction<LocationChangedPayload>>,
    ) => {
      if (state.open[viewId]) {
        state.open[viewId].location = location;
      }
    },
    setColorScheme: (state, { payload }: PayloadAction<ColorScheme>) => {
      state.colorScheme = payload;
    },
    handleColorSchemeChange: state => {
      state.colorScheme = state.colorScheme === 'light' ? 'dark' : 'light';
    },
    setActiveSheet: (state, { payload }: PayloadAction<BottomSheet | null>) => {
      state.activeSheet = payload;
    },
    setActivePage: (
      state,
      {
        payload,
      }: PayloadAction<{ route: string; params?: Record<string, unknown> }>,
    ) => {
      state.activePage = payload;
    },
    setActiveSheetPage: (
      state,
      { payload }: PayloadAction<SheetPageNavigation | null>,
    ) => {
      state.activeSheetPage = payload;
    },
    setLanguage: (state, { payload }: PayloadAction<SupportedLanguage>) => {
      state.language = isSupportedLanguage(payload)
        ? payload
        : DEFAULT_LANGUAGE;
      state.hasExplicitLanguagePreference = true;
    },
  },
  selectors: {
    selectOpenViews: createSelector(
      (state: ViewsSliceState) => state.open,
      open => Object.values(open),
    ),
    selectOpenViewsMap: (state: ViewsSliceState) => state.open,
    selectColorScheme: ({ colorScheme }) => colorScheme,
    getActiveSheet: (state: ViewsSliceState) => state.activeSheet,
    getActivePage: (state: ViewsSliceState) => state.activePage,
    getActiveSheetPage: (state: ViewsSliceState) => state.activeSheetPage,
    selectLanguage: (state: ViewsSliceState) => state.language,
    selectHasExplicitLanguagePreference: (state: ViewsSliceState) =>
      state.hasExplicitLanguagePreference,
  },
});

export const viewsReducers = {
  [slice.name]: slice.reducer,
};

const navigate = createAction(
  'views/callHistoryMethod',
  (
    viewId: ViewId,
    location: ViewLocation,
  ): Pick<PayloadAction<CallHistoryMethodPayload<'push'>>, 'payload'> => ({
    payload: {
      args: [location],
      method: 'push',
      viewId,
    },
  }),
);

const closeView = createAction('views/closeView', (payload: ViewId) => ({
  payload,
}));

const openView = createAction(
  'views/openView',
  (payload: Readonly<OpenViewPayload>) => ({
    payload,
  }),
);

/** Direct import of this is an anti-pattern. OK for tests. */
export const viewsActions = {
  views: {
    ...slice.actions,
    closeView,
    openView,
    navigate,
  },
};

/** Direct import of this is an anti-pattern. OK for tests. */
export const viewsSelectors = { views: slice.selectors };

export type ViewsStoreState = StateFromReducersMapObject<typeof viewsReducers>;
