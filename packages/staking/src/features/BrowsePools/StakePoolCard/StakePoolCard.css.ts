import { style, sx } from '@lace/ui';
import { theme } from '../../theme';

export const card = sx({
  boxSizing: 'border-box',
  height: '$84',
  padding: '$20',
});

export const title = sx({
  height: '$20',
  width: '$120',
});

export const cardSelected = style({
  borderColor: theme.colors.$poolCardSelectedBorderColor,
});
