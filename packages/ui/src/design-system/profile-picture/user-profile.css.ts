import { style } from '@vanilla-extract/css';

import { sx } from '../../design-tokens';

export const root = style([
  sx({
    height: '$32',
    width: '$32',
    borderRadius: '$circle',
    background: '$lace_gradient',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  {
    overflow: 'hidden',
    userSelect: 'none',
  },
]);

export const image = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: 'inherit',
});

export const fallbackText = sx({
  color: '$profile_picture_avatar_label_color',
});
