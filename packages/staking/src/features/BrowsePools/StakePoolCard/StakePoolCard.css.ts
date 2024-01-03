import { style, sx } from '@lace/ui';
import { theme } from '../../theme';

export const card = sx({
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  height: '$84',
  padding: '$20',
});

export const tickerName = style({
  fontWeight: theme.fontWeights.$semibold,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  width: theme.spacing.$120,
});

export const firstRow = style({
  display: 'flex',
  justifyContent: 'space-between',
});

export const cardSelected = style({
  borderColor: theme.colors.$poolCardSelectedBorderColor,
});
