import { useContext } from 'react';

import { ThemeContext } from '../theme.context';

import type { ThemeColorScheme } from '../theme.context';

export const useThemeVariant = (): { theme: ThemeColorScheme } => {
  const themeContext = useContext(ThemeContext);

  return { theme: themeContext.colorScheme };
};
