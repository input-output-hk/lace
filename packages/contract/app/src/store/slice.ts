import { createAction } from '@reduxjs/toolkit';

import type * as _ from 'immer';

export const reloadApplication = createAction('app/reloadApplication');

/** Direct import of this is an anti-pattern. OK for tests. */
export const appActions = {
  app: {
    reloadApplication,
  },
};

// UI types
export type IconConfig = {
  name: string;
  size?: number;
  variant?: 'solid' | 'stroke';
  color?: string;
};

// Using a generic type for image to avoid react-native dependency in contract
export type ImageSource = Record<string, unknown> | number | { uri: string };

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
  leftImage?: ImageSource;
  rightIcon?: IconConfig;
};

// UI actions - these are placeholders that will be implemented by modules
// The actual implementations are provided by app-mobile module
export const showToast = createAction<ToastConfig>('ui/showToast');
export const hideToast = createAction('ui/hideToast');

export const uiActions = {
  ui: {
    showToast,
    hideToast,
  },
};
