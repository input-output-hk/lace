import { style } from '@vanilla-extract/css';

import { sx } from '../../design-tokens';

export const defaultContainer = sx({
  maxWidth: '$294',
});

export const sideDrawerContainer = sx({
  maxWidth: '$336',
});

export const icon = sx({
  width: '$84',
  height: '$84',
  marginBottom: '$4',
});

export const title = style([
  sx({
    mt: '$8',
  }),
  {
    textAlign: 'center',
  },
]);

export const description = style({
  textAlign: 'center',
});
