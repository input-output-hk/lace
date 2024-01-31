import { style, sx } from '../../design-tokens';

export const dialogDescription = style([
  sx({
    color: '$dialog_description_color',
    fontWeight: '$regular',
  }),
  {
    textAlign: 'center',
  },
]);
