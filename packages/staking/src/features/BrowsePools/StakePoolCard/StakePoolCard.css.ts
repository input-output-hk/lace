import { style, sx } from '@lace/ui';
import { theme } from '../../theme';

export const card = style([
  sx({
    boxSizing: 'border-box',
    padding: '$20',
    width: '$fill',
  }),
  {
    borderWidth: 1.5,
    overflow: 'hidden',
  },
]);

export const title = style([
  sx({
    height: '$24',
    width: '$fill',
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
