import { ThemeColorScheme } from '@lace/ui';
import { darkTheme, lightTheme } from './theme.css';

export const getThemeClassName = (scheme: ThemeColorScheme) =>
  ({
    [ThemeColorScheme.Dark]: darkTheme,
    [ThemeColorScheme.Light]: lightTheme,
  }[scheme]);
