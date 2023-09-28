import { style, sx } from '@lace/ui';
import { theme } from '../../theme';

export const PoolIndicator = sx({ borderRadius: '$tiny', height: '$40', width: '$4' });

export const valuesBox = style({
  borderBottomWidth: 1,
  borderColor: theme.colors.$preferencesPoolCardBorderColor,
  borderTopWidth: 1,
});
