import type { PropsWithChildren } from 'react';
import React, { createContext, useContext } from 'react';

import { darkTheme } from './dark-theme.css';
import { lightTheme } from './light-theme.css';

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
  const context = useContext(ThemeContext);
  //   if (context === null) throw new Error('ThemeContext not defined');
  return context;
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
