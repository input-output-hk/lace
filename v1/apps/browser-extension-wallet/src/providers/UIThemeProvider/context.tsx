import React from 'react';
import { ThemeColorScheme, ThemeProvider } from '@input-output-hk/lace-ui-toolkit';

import { useTheme } from '@providers/ThemeProvider';

interface Props {
  children: React.ReactNode;
}

export const UIThemeProvider = ({ children }: Props): React.ReactElement => {
  const { theme } = useTheme();
  return (
    <ThemeProvider colorScheme={theme.name === 'light' ? ThemeColorScheme.Light : ThemeColorScheme.Dark}>
      {children}
    </ThemeProvider>
  );
};
