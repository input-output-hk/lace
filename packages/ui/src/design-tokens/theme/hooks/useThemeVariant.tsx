import { useContext } from 'react';

import { ThemeColorScheme, ThemeContext } from '../theme.context';

export const useThemeVariant = (): ThemeColorScheme => {
  const themeContext = useContext(ThemeContext);

  if (!themeContext) {
    return '';
  }

  return themeContext.colorScheme;
};
