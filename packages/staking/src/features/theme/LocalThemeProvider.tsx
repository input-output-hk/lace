// eslint-disable-next-line no-restricted-imports
import { ThemeColorScheme, LocalThemeProvider as UIToolkitLocalThemeProvider } from '@lace/ui';
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
