import { createThemeContract } from '@vanilla-extract/css';

import { borders } from '../borders.data';
import { colors } from '../colors.data';
import { elevation } from '../elevation.data';
import { opacities } from '../opacities.data';
import { radius } from '../radius.data';
import { spacing } from '../spacing.data';
import {
  fontWeights,
  fontSizes,
  lineHeights,
  fontFamily,
} from '../typography.data';

export const vars = createThemeContract({
  borders,
  spacing,
  fontWeights,
  fontSizes,
  lineHeights,
  fontFamily,
  colors,
  radius,
  elevation,
  opacities,
});

export type Theme = typeof vars;
