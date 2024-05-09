import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';

import cs from 'classnames';

import { darkTheme } from './local-dark-theme.css';
import { lightTheme } from './local-light-theme.css';
import { vars } from './theme-contract.css';
import * as cx from './theme-provider.css';
import { ThemeContext, ThemeColorScheme } from './theme.context';

import type { ThemeContextValue } from './theme.context';

type LocalThemeProviderProps = PropsWithChildren<{
  className?: string;
  colorScheme: ThemeColorScheme;
}>;

export const LocalThemeProvider = ({
  children,
  className,
  colorScheme,
}: Readonly<LocalThemeProviderProps>): React.ReactElement => {
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
        data-theme={colorScheme}
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
