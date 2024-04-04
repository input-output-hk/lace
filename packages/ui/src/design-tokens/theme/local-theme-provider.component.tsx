import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';

import cs from 'classnames';

import { darkTheme as UIDarkTheme } from './local-dark-theme.css';
import { lightTheme as UILightTheme } from './local-light-theme.css';
import { vars } from './theme-contract.css';
import * as cx from './theme-provider.css';
import { ThemeContext, ThemeColorScheme } from './theme.context';

import type { ThemeContextValue } from './theme.context';

type LocalThemeProviderProps = PropsWithChildren<{
  className?: string;
  colorScheme: ThemeColorScheme;
  customDarkTheme?: string;
  customLightTheme?: string;
  customVars?: object;
}>;

export const LocalThemeProvider = ({
  children,
  className,
  colorScheme,
  customDarkTheme = '',
  customLightTheme = '',
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
        className={cs(cx.root, className, {
          [UIDarkTheme]: colorScheme === ThemeColorScheme.Dark,
          [UILightTheme]: colorScheme === ThemeColorScheme.Light,
          [customDarkTheme]: colorScheme === ThemeColorScheme.Dark,
          [customLightTheme]: colorScheme === ThemeColorScheme.Light,
        })}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
