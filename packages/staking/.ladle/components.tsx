import { GlobalProvider, ThemeState } from '@ladle/react';
import { ThemeColorScheme, ThemeProvider } from '@lace/ui';
import React, { useMemo } from 'react';

export const Provider: GlobalProvider = ({ children, globalState }) => {
  const isLightTheme = useMemo(() => globalState.theme === ThemeState.Light, [globalState.theme]);
  return (
    <ThemeProvider colorScheme={isLightTheme ? ThemeColorScheme.Light : ThemeColorScheme.Dark}>
      {children}
    </ThemeProvider>
  );
};
