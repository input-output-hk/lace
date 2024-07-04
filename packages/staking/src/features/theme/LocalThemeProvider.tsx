// eslint-disable-next-line no-restricted-imports
import { ThemeColorScheme, LocalThemeProvider as UIToolkitLocalThemeProvider } from '@input-output-hk/lace-ui-toolkit';
import { ReactNode } from 'react';
import { darkTheme, lightTheme } from './theme.css';

type LocalThemeProviderProps = {
  children: ReactNode;
  colorScheme: ThemeColorScheme;
};

/**
 * LocalThemeProvider should be only used for the Storybook demo purposes.
 */
export const LocalThemeProvider = ({ children, colorScheme }: LocalThemeProviderProps) => (
  <UIToolkitLocalThemeProvider colorScheme={colorScheme} customDarkTheme={darkTheme} customLightTheme={lightTheme}>
    {children}
  </UIToolkitLocalThemeProvider>
);
