import { style, sx } from '@lace/ui';
import { theme } from 'features/theme';

export const textBoxLeft = style({
  borderBottomLeftRadius: 16,
  borderBottomRightRadius: 0,
  borderRightColor: theme.colors.$browsePoolsFilterInputRightBorderColor,
  borderRightStyle: 'solid',
  borderRightWidth: 1.5,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 0,
});

export const textBoxRight = style({
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 16,
  borderTopLeftRadius: 0,
  borderTopRightRadius: 16,
});

export const radioGroup = sx({
  width: '$fill',
});

export const selectGroup = sx({
  width: '$fill',
});

export const card = sx({
  width: '$342',
});
