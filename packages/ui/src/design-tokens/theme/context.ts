import { createContext, useContext } from 'react';

import { vars } from './theme-contract.css';

import type { Theme } from './theme-contract.css';

export enum ThemeColorScheme {
  Dark = 'dark',
  Light = 'light',
}

export interface ThemeContextValue {
  colorScheme: ThemeColorScheme;
  vars: Theme;
}

export const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: ThemeColorScheme.Light,
  vars,
});

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  //   if (context === null) throw new Error('ThemeContext not defined');
  return context;
};
