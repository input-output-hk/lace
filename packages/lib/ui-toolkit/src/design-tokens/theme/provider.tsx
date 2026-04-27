import type { ColorSchemeName } from 'react-native';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, useWindowDimensions } from 'react-native';

import { isCompactWidth, isMediumWidth } from '../../design-system';

import { darkTheme } from './dark';
import { lightTheme } from './light';

import type { ThemeContextType, LayoutSize, FontFamily } from './types';

interface FeatureFlag {
  key: string;
  payload?: {
    fontFamily: FontFamily;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const computeMediaBreakpoint = ({ width }: { width: number }): LayoutSize => {
  if (isCompactWidth(width)) return 'compact';
  if (isMediumWidth(width)) return 'medium';
  return 'large';
};

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  defaultTheme: ColorSchemeName;
  featureFlags?: FeatureFlag[];
}> = ({ children, defaultTheme, featureFlags = [] }) => {
  const [themeChoice, setThemeChoice] = useState<ColorSchemeName>(defaultTheme);
  const [temporaryTheme, setTemporaryTheme] = useState<ColorSchemeName | null>(
    null,
  );
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => {
    const fontSelectionFlag = featureFlags.find(
      flag => flag.key === 'FONT_SELECTION',
    );
    if (fontSelectionFlag?.payload?.fontFamily) {
      return fontSelectionFlag.payload.fontFamily;
    }
    return 'primary';
  });
  // This is needed to change the font family when the feature flag changes
  useEffect(() => {
    const fontSelectionFlag = featureFlags.find(
      flag => flag.key === 'FONT_SELECTION',
    );
    const nextFontFamily = fontSelectionFlag?.payload?.fontFamily || 'primary';
    setFontFamily(current =>
      current === nextFontFamily ? current : nextFontFamily,
    );
  }, [featureFlags]);
  const { height, width } = useWindowDimensions();

  // TODO: [LW-12675] use a default value from state
  const [layoutSize, setLayoutSize] = useState<LayoutSize>(
    computeMediaBreakpoint({ width }),
  );

  useEffect(() => {
    setLayoutSize(computeMediaBreakpoint({ width }));
  }, [width, height]);

  useEffect(() => {
    setThemeChoice(defaultTheme);
  }, [defaultTheme]);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (!temporaryTheme) {
        setThemeChoice(colorScheme || 'dark');
      }
    });

    return () => {
      if (subscription?.remove) {
        subscription.remove();
      }
    };
  }, [temporaryTheme]);

  const toggleTheme = useCallback(async () => {
    setThemeChoice(previous => (previous === 'light' ? 'dark' : 'light'));
  }, []);

  const setTemporaryThemeChoice = useCallback(
    (theme: ColorSchemeName | null) => {
      setTemporaryTheme(theme);
    },
    [],
  );

  const clearTemporaryTheme = useCallback(() => {
    setTemporaryTheme(null);
  }, []);

  const theme = useMemo(() => {
    const activeTheme = temporaryTheme || themeChoice;
    const baseTheme = activeTheme === 'dark' ? darkTheme : lightTheme;
    return {
      ...baseTheme,
      typography: {
        ...baseTheme.typography,
        fontFamily,
      },
    };
  }, [temporaryTheme, themeChoice, fontFamily]);

  const isSideMenu = useMemo(() => layoutSize !== 'compact', [layoutSize]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        toggleTheme,
        layoutSize,
        isSideMenu,
        setFontFamily,
        setTemporaryThemeChoice,
        clearTemporaryTheme,
      }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export const useOptionalTheme = (): ThemeContextType | undefined =>
  useContext(ThemeContext);
