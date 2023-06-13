import { sx, style } from '../../design-tokens';

export const container = style([
  sx({
    pl: '$40',
    pr: '$16',
  }),
  {
    gridArea: 'body',
    overflow: 'auto',
  },
]);
