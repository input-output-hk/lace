import { sx, style } from '../../design-tokens';

export const gridArea = style({
  gridArea: 'header',
});

export const container = style([
  sx({
    py: '$24',
    px: '$40',
  }),
  {
    gridArea: 'header',
  },
]);
