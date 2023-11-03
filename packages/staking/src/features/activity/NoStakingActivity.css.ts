import { style } from '@lace/ui';
import { theme } from 'features/theme';

export const sadFaceIcon = style({
  height: theme.spacing.$112,
  width: theme.spacing.$112,
});

export const noActivityText = style({
  color: theme.colors.$activityNoActivityTextColor,
  fontSize: theme.fontSizes.$14,
  fontWeight: theme.fontWeights.$semibold,
});
