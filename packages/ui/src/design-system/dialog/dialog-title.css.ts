import { style, sx } from '../../design-tokens';

export const dialogTitle = style([
  sx({
    color: '$dialog_title_color',
    fontWeight: '$bold',
  }),
  {
    textAlign: 'center',
    marginBottom: 0,
    lineHeight: 1.3,
  },
]);
