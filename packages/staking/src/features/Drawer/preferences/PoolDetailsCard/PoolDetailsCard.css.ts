import { style, sx } from '../../../../design-tokens';
import { theme } from '../../../theme';

export const root = style({
  width: theme.spacing.$584,
});

export const poolIndicator = sx({ borderRadius: '$tiny', height: '$40', width: '$4' });
