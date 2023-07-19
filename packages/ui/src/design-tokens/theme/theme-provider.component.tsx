import type { PropsWithChildren } from 'react';
import React, { useEffect, useMemo } from 'react';

import './dark-theme.css';
import './light-theme.css';
import { vars } from './theme-contract.css';
import { ThemeContext } from './theme.context';

import type { ThemeContextValue, ThemeColorScheme } from './theme.context';

type ThemeProviderProps = PropsWithChildren<{
  colorScheme: ThemeColorScheme;
}>;

export const ThemeProvider = ({
  children,
  colorScheme,
}: Readonly<ThemeProviderProps>): React.ReactElement => {
  const value = useMemo<ThemeContextValue>(
    () => ({
      colorScheme,
      vars,
    }),
    [colorScheme],
  );

  const htmlElement = useMemo(() => document.querySelector('html'), []);

  useEffect(() => {
    if (htmlElement) {
      // eslint-disable-next-line functional/immutable-data
      htmlElement.dataset.theme = colorScheme;
    }
  }, [colorScheme, htmlElement]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
