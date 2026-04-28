import type { ColorSchemeName } from 'react-native';

export type Theme = {
  name: 'dark' | 'light';
  brand: {
    ascending: string;
    ascendingSecondary: string;
    support: string;
    supportSecondary: string;
    pinkish: string;
    pinkishSecondary: string;
    salmon: string;
    yellow: string;
    yellowSecondary: string;
    orange: string;
    white: string;
    lightGray: string;
    darkGray: string;
    black: string;
  };
  background: {
    page: string;
    primary: string;
    primarySolid: string;
    secondary: string;
    tertiary: string;
    overlay: string;
    positive: string;
    negative: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  border: {
    top: string;
    middle: string;
    bottom: string;
    focused: string;
  };
  shadow: {
    drop: string;
    inner: string;
  };
  data: {
    positive: string;
    negative: string;
  };
  extra: {
    chathamsBlue: string;
    fancyBorder: string;
    shadowDrop: string;
    shadowInner: string;
    shadowInnerStrong: string;
  };
  typography: {
    fontFamily: FontFamily;
  };
  icons: {
    background: string;
  };
};

export type LayoutSize = 'compact' | 'large' | 'medium';
export type FontFamily = 'primary' | 'secondary';

export type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  layoutSize: LayoutSize;
  isSideMenu: boolean;
  setFontFamily: (fontFamily: FontFamily) => void;
  setTemporaryThemeChoice: (theme: ColorSchemeName | null) => void;
  clearTemporaryTheme: () => void;
};
