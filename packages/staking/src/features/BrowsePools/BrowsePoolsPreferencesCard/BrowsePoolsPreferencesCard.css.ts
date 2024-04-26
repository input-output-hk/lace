import { style, sx } from '@lace/ui';
import { theme } from 'features/theme';

export const textBoxLeft = style({
  borderBottomRightRadius: 0,
  borderRightColor: theme.colors.$browsePoolsFilterInputRightBorderColor,
  borderRightStyle: 'solid',
  borderRightWidth: 2,
  borderTopRightRadius: 0,
});

export const textBoxRight = style({
  borderBottomLeftRadius: 0,
  borderTopLeftRadius: 0,
});

export const radioGroup = sx({
  width: '$fill',
});
