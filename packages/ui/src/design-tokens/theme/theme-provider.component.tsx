import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';

import cs from 'classnames';

import { darkTheme } from './dark-theme.css';
import { lightTheme } from './light-theme.css';
import { vars } from './theme-contract.css';
import * as cx from './theme-provider.css';
import { ThemeColorScheme, ThemeContext } from './theme.context';

import type { ThemeContextValue } from './theme.context';

type ThemeProviderProps = PropsWithChildren<{
  className?: 'string';
  colorScheme: ThemeColorScheme;
}>;

export const ThemeProvider = ({
  children,
  className,
  colorScheme,
}: Readonly<ThemeProviderProps>): React.ReactElement => {
  const value = useMemo<ThemeContextValue>(
    () => ({
      colorScheme,
      vars,
    }),
    [colorScheme],
  );
  return (
    <ThemeContext.Provider value={value}>
      <div
        className={cs(cx.root, className, {
          [darkTheme]: colorScheme === ThemeColorScheme.Dark,
          [lightTheme]: colorScheme === ThemeColorScheme.Light,
        })}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
