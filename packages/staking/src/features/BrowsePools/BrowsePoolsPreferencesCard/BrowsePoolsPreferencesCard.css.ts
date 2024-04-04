import { style } from '@lace/ui';
import { sx } from 'features/theme';

export const textBoxLeft = style([
  sx({
    borderRightColor: '$browsePoolsFilterInputRightBorderColor',
  }),
  {
    borderBottomRightRadius: 0,
    borderRightStyle: 'solid',
    borderRightWidth: 2,
    borderTopRightRadius: 0,
  },
]);

export const textBoxRight = style({
  borderBottomLeftRadius: 0,
  borderTopLeftRadius: 0,
});

export const radioGroup = sx({
  width: '$fill',
});

export const selectGroup = sx({
  width: '$fill',
});
