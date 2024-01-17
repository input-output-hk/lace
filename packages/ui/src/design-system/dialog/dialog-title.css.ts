import { style, sx } from '../../design-tokens';

export const dialogTitle = style([
  sx({
    fontWeight: '$bold',
  }),
  {
    textAlign: 'center',
    marginBottom: 0,
    lineHeight: 1.3,
  },
]);
