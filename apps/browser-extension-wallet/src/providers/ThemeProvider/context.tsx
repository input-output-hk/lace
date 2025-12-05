import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import merge from 'lodash/merge';
import type { Theme, ThemeInstance, themes as themeTypes } from './types';
import { defaultTheme } from './constants';

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
    },
    [themes]
  );

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    const preferedTheme = localStorage.getItem('mode') as themeTypes;
    let userAgentColorScheme: themeTypes = 'light';
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')?.matches) {
      userAgentColorScheme = 'dark';
    }

    changeTheme(getThemeName(preferedTheme || userAgentColorScheme));
    if (window.matchMedia('(prefers-color-scheme)')?.media !== 'not all') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const change = (e: MediaQueryListEvent) => changeTheme(e.matches ? 'dark' : 'light');
      media?.addEventListener('change', change);

      return () => media.removeEventListener('change', change);
    }
  }, [getThemeName, defaultThemeName, changeTheme]);

  const contextValue: ThemeProvider = {
    theme,
    setTheme: changeTheme
  };
  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};
