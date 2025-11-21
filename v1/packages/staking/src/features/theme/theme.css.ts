import {
  borders,
  elevation,
  fontFamily,
  fontSizes,
  fontWeights,
  lineHeights,
  opacities,
  radius,
  spacing,
} from '@input-output-hk/lace-ui-toolkit';
import { createGlobalTheme, createTheme, createThemeContract } from '@vanilla-extract/css';
import { colorsContract, darkThemeColors, lightThemeColors } from './colors';

const themeCommon = {
  borders,
  elevation,
  fontFamily,
  fontSizes,
  fontWeights,
  lineHeights,
  opacities,
  radius,
  spacing,
};

export const theme = createThemeContract({
  colors: colorsContract,
  ...themeCommon,
});

// For use only with the LocalThemeProvider
export const darkTheme = createTheme(theme, {
  colors: darkThemeColors,
  ...themeCommon,
});

// For use only with the LocalThemeProvider
export const lightTheme = createTheme(theme, {
  colors: lightThemeColors,
  ...themeCommon,
});

createGlobalTheme('[data-theme="light"]:root', theme, {
  colors: lightThemeColors,
  ...themeCommon,
});
createGlobalTheme('[data-theme="dark"]:root', theme, {
  colors: darkThemeColors,
  ...themeCommon,
});
