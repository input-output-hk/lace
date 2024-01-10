import { style, sx } from '@lace/ui';
import { theme } from '../../theme';

export const card = sx({
  boxSizing: 'border-box',
  padding: '$20',
});

export const title = style([
  sx({
    height: '$24',
    width: '$120',
  }),
  {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
]);

export const cardSelected = style({
  borderColor: theme.colors.$poolCardSelectedBorderColor,
});
