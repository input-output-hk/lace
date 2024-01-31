import { style, sx } from '@lace/ui';

export const groupedInputContainer = style([
  sx({
    borderBottomLeftRadius: '$medium',
    borderTopLeftRadius: '$medium',
    width: '$fill',
  }),
]);

export const selectGroup = style([
  sx({
    w: '$fill',
  }),
  {
    backgroundColor: 'F9F9F9',
  },
]);
