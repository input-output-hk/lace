import type { ImageSourcePropType } from 'react-native';

import { createSlice } from '@reduxjs/toolkit';

import type { GenericSheet } from './types';
import type { FolderId, Token } from '@lace-contract/tokens';
import type { PayloadAction } from '@reduxjs/toolkit';

type BaseRoutes = '/' | '/accounts' | '/more' | '/stake';
export type ThemePreference = 'dark' | 'light' | 'system';

export type IconConfig = {
  name: string;
  size?: number;
  variant?: 'solid' | 'stroke';
  color?: string;
};

export type ToastConfig = {
  text: string;
  subtitle?: string;
  color?:
    | 'black'
    | 'negative'
    | 'neutral'
    | 'positive'
    | 'primary'
    | 'secondary'
    | 'white';
  backgroundType?: 'colored' | 'semiTransparent' | 'transparent';
  duration?: number;
  position?: 'bottom' | 'top';
  leftIcon?: IconConfig;
  leftImage?: ImageSourcePropType;
  rightIcon?: IconConfig;
};

// Consider refactoring into a slice/reducer set per main screen
// e.g portfolio, accounts, stake, more
export type MobileState = {
  ui: {
    /**
     * General refers to items that are 'global' across multiple routes
     * examples are the send, receive, buy, swap action buttons,
     * and their associated actions
     *  */
    general: {
      // send flow covered separately by state machine
      activeSheet: GenericSheet;
      themePreference: ThemePreference;
      customAPI: string;
      toast: ToastConfig | null;
      isForeground: boolean;
    };
    portfolio: {
      selectedToken: Token | null;
      selectedFolderId: FolderId | null;
      isPortfolioView: boolean;
    };
    more: {
      selectedDapp: number | null;
    };
    routing: {
      activeRoute: BaseRoutes;
    };
  };
};

const initialState: MobileState = {
  ui: {
    general: {
      activeSheet: null,
      themePreference: 'system',
      customAPI: '',
      toast: null,
      isForeground: false,
    },
    portfolio: {
      selectedToken: null,
      selectedFolderId: null,
      isPortfolioView: true, // Portfolio page starts in portfolio view (index 0)
    },
    more: {
      selectedDapp: null,
    },
    routing: { activeRoute: '/' },
  },
};

const slice = createSlice({
  name: 'mobile',
  initialState,
  reducers: {
    setActiveRoute: (state, { payload }: PayloadAction<BaseRoutes>) => {
      state.ui.routing.activeRoute = payload;
    },
    setActiveSheet: (state, { payload }: PayloadAction<GenericSheet>) => {
      state.ui.general.activeSheet = payload;
    },
    setSelectedFolderId: (
      state,
      { payload }: PayloadAction<FolderId | null>,
    ) => {
      state.ui.portfolio.selectedFolderId = payload;
    },
    setThemePreference: (
      state,
      { payload }: PayloadAction<ThemePreference>,
    ) => {
      state.ui.general.themePreference = payload;
    },
    setIsPortfolioView: (state, { payload }: PayloadAction<boolean>) => {
      state.ui.portfolio.isPortfolioView = payload;
    },
    setCustomAPI: (state, { payload }: PayloadAction<string>) => {
      state.ui.general.customAPI = payload;
    },
    showToast: (state, { payload }: PayloadAction<ToastConfig>) => {
      state.ui.general.toast = payload;
    },
    hideToast: state => {
      state.ui.general.toast = null;
    },
  },
  // ui.getCurrency is deprecated but not removed from persisted state
  // to avoid a migration. Currency preference now lives in
  // tokenPricing.selectCurrencyPreference (@lace-contract/token-pricing).
  selectors: {
    getActiveRoute: (state: Readonly<MobileState>) =>
      state.ui.routing.activeRoute,
    getActiveSheet: (state: Readonly<MobileState>) =>
      state.ui.general.activeSheet,
    getSelectedFolderId: (state: Readonly<MobileState>) =>
      state.ui.portfolio.selectedFolderId,
    getThemePreference: (state: Readonly<MobileState>) =>
      state.ui.general.themePreference,
    getIsPortfolioView: (state: Readonly<MobileState>) =>
      state.ui.portfolio.isPortfolioView,
    getCustomAPI: (state: Readonly<MobileState>) => state.ui.general.customAPI,
    getToast: (state: Readonly<MobileState>) => state.ui.general.toast,
    getIsForeground: (state: Readonly<MobileState>) =>
      state.ui.general.isForeground,
  },
});

export const reducers = {
  [slice.name]: slice.reducer,
};

export const uiActions = {
  ui: {
    ...slice.actions,
  },
};

export const uiSelectors = { ui: slice.selectors };
