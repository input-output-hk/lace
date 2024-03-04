import { style } from '@lace/ui';
import { theme } from '../../theme';

export const container = style({
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
});

export const icon = style({
  fontSize: theme.spacing.$112,
});

export const text = style({
  color: theme.colors.$preferencesDrawerNoPoolsTextColor,
});
