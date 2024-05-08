import { createGlobalTheme, createThemeContract } from '@vanilla-extract/css';
import {
  elevation,
  fontFamily,
  fontSizes,
  fontWeights,
  lineHeights,
  opacities,
  radius,
  spacing,
} from '../../design-tokens';
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

createGlobalTheme('[data-theme="light"]:root', theme, {
  colors: lightThemeColors,
  ...themeCommon,
});
createGlobalTheme('[data-theme="dark"]:root', theme, {
  colors: darkThemeColors,
  ...themeCommon,
});
