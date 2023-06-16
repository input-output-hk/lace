import type { PropsWithChildren } from 'react';
import React, { createContext, useContext } from 'react';

import { darkTheme } from './theme/dark-theme.css';
import { lightTheme } from './theme/light-theme.css';

export enum ThemeColorScheme {
  Dark = 'dark',
  Light = 'light',
}

interface ThemeProvider {
  colorScheme: ThemeColorScheme;
}

const ThemeContext = createContext<ThemeProvider>({
  colorScheme: ThemeColorScheme.Light,
});

export const useTheme = (): ThemeProvider => {
  return useContext(ThemeContext);
};

type Props = PropsWithChildren<{
  colorScheme: ThemeColorScheme;
}>;

export const ThemeProvider = ({
  children,
  colorScheme,
}: Readonly<Props>): React.ReactElement => {
  return (
    <div
      style={{ height: '100%', width: '100%' }}
      className={colorScheme === ThemeColorScheme.Dark ? darkTheme : lightTheme}
    >
      {children}
    </div>
  );
};
