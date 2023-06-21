import { elevation, fontFamily, fontSizes, fontWeights, lineHeights, opacities, radius, spacing } from '@lace/ui';
import { createTheme, createThemeContract } from '@vanilla-extract/css';
import { colorsContract, darkThemeColors, lightThemeColors } from './colors';

const themeCommon = {
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

export const lightTheme = createTheme(theme, {
  colors: lightThemeColors,
  ...themeCommon,
});

export const darkTheme = createTheme(theme, {
  colors: darkThemeColors,
  ...themeCommon,
});
