import { style, sx } from '../../design-tokens';

export const container = style([
  sx({
    height: '$48',
  }),
  {
    gridArea: 'profile',
  },
]);

export const image = sx({
  mr: {
    popupScreen: '$16',
    smallScreen: '$24',
  },
});
