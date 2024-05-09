import { style } from '@vanilla-extract/css';

import { sx, vars } from '../../design-tokens';

export const container = sx({
  px: '$24',
  py: '$16',
  backgroundColor: '$info_bar_container_bgColor',
  borderRadius: '$medium',
  alignItems: 'center',
});

export const icon = sx({
  width: '$24',
  height: '$24',
  fontSize: '$25',
  mr: '$24',
  color: '$info_bar_icon_color',
});

export const message = style([
  sx({
    mt: '$8',
  }),
  {
    color: vars.colors.$info_bar_message_color,
    textAlign: 'center',
    whiteSpace: 'pre-wrap',
  },
]);
