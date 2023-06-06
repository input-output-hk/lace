import { sx, style } from '../../design-tokens';

export const container = style([
  sx({
    px: '$40',
    height: '$fill',
  }),
  {
    gridArea: 'body',
  },
]);
