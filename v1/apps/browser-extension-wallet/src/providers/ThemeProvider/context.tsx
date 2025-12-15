import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import merge from 'lodash/merge';
import type { Theme, ThemeInstance, themes as themeTypes } from './types';
import { defaultTheme } from './constants';
import { useLMP } from '@src/hooks/useLMP';
import { logger } from '@lace/common';

interface ThemeProviderProps {
  children: React.ReactNode;
  customTheme?: ThemeInstance;
  defaultThemeName?: themeTypes;
}

interface ThemeProvider {
  theme: ThemeInstance;
  setTheme: (theme: themeTypes) => void;
}

// eslint-disable-next-line unicorn/no-null
const ThemeContext = createContext<ThemeProvider | null>(null);

export const useTheme = (): ThemeProvider => {
  const context = useContext(ThemeContext);
  if (context === null) throw new Error('ThemeContext not defined');
  return context;
};

const preferableDefaultThemeName = 'light';

export const ThemeProvider = ({ children, customTheme, defaultThemeName }: ThemeProviderProps): React.ReactElement => {
  const themes = useMemo(() => merge(customTheme, defaultTheme), [customTheme]);
  const { colorScheme, isBundle, setColorScheme } = useLMP();

  // picks 'default' theme if given is absent
  const getThemeName = useCallback(
    (name: themeTypes): keyof Theme => themes[name]?.name || preferableDefaultThemeName,
    [themes]
  );

  const [theme, setTheme] = useState<ThemeInstance>(themes[getThemeName(defaultThemeName)]);

  const changeTheme = useCallback(
    (name?: themeTypes) => {
      if (!themes[name]) return;

      setTheme(themes[name]);
      // save on local storage
      localStorage.setItem('mode', name);
      // chakra-ui related theme settings
      localStorage.setItem('chakra-ui-color-mode', name);
      // set css values for chosen theme
      document.documentElement.dataset.theme = name;
      // Sync with LMP
      setColorScheme(name).catch((error) => {
        logger.error('Error setting color scheme in LMP:', error);
      });
    },
    [setColorScheme, themes]
  );

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    let preferredTheme = localStorage.getItem('mode') as themeTypes;

    // Wait for LMP API to be initialized before initializing the theme
    if (isBundle === undefined || colorScheme === undefined) return;

    if (isBundle && colorScheme.syncedWithV1 && colorScheme.colorScheme !== preferredTheme)
      preferredTheme = colorScheme.colorScheme;

    let userAgentColorScheme: themeTypes = 'light';
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')?.matches) {
      userAgentColorScheme = 'dark';
    }

    changeTheme(getThemeName(preferredTheme || userAgentColorScheme));

    if (window.matchMedia('(prefers-color-scheme)')?.media !== 'not all') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const change = (e: MediaQueryListEvent) => changeTheme(e.matches ? 'dark' : 'light');
      media?.addEventListener('change', change);

      // eslint-disable-next-line consistent-return
      return () => media.removeEventListener('change', change);
    }
  }, [changeTheme, colorScheme, defaultThemeName, getThemeName, isBundle]);

  const contextValue: ThemeProvider = {
    theme,
    setTheme: changeTheme
  };
  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};
