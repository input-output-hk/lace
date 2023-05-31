import { style } from '@vanilla-extract/css';

import { sx } from '../../design-tokens';

export const root = style([
  sx({
    height: '$40',
    width: '$40',
    borderRadius: '$circle',
  }),
  {
    overflow: 'hidden',
    userSelect: 'none',
    position: 'relative',
  },
]);

export const text = style([
  sx({
    color: '$profile_picture_initials_label_color',
  }),
  {
    zIndex: 1,
  },
]);

export const background = style([
  sx({
    width: '$fill',
    height: '$fill',
    backgroundColor: '$profile_picture_initials_container_bgColor',
    opacity: '$0_1',
  }),
  {
    position: 'absolute',
  },
]);
